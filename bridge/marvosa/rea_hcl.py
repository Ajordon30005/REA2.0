#!/usr/bin/env python3
"""REA × Marvosa: evidence transport around unmodified HCL engines.

SPDX-License-Identifier: GPL-3.0-only
Arithmetic, resonance and HVP transduction belong to vendor/. This module
owns input parsing, evidence storage, resource ownership and JSON delivery only.
Evidence bytes are forensic artifacts, not an alternative model checkpoint.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
from contextlib import closing
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "vendor" / "engine"))
import hcl_engine as engine
import hcl_memory as memory
import juj

VERSION = "2.0.0"
FORMAT = "rea-marvosa-case/2"
LEGACY_FORMAT = "rea-marvosa-case/1"
# Only for authenticating existing v1 cases before an explicit write upgrades
# them. New intake and indexing have no integration-imposed content cutoff.
LEGACY_INDEX_CHARS = 4096


class CaseError(ValueError):
    """An expected boundary or evidence-integrity failure."""


class IntegrityError(CaseError):
    """Retained evidence or native engine consistency is invalid."""


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":"), allow_nan=False)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def load_json(raw):
    # Evidence decimal tokens remain exact decimal strings when indexed.
    # The original JSON bytes are stored and returned verbatim.
    return json.loads(raw, parse_float=Decimal,
                      parse_constant=lambda _: (_ for _ in ()).throw(
                          CaseError("Non-finite JSON numbers are not supported")))


def alpha_status():
    values = {}
    for name, module in (("arithmetic", engine), ("memory", memory),
                         ("processor", juj)):
        intact = abs(module.ALPHA_INV - 137 * module.SCALE) < module.SCALE
        values[name] = {"intact": intact, "alpha_inverse": str(module.ALPHA_INV),
                        "scale": str(module.SCALE)}
    return {"intact": all(v["intact"] for v in values.values()), "engines": values}


def require_alpha():
    result = alpha_status()
    if not result["intact"]:
        raise IntegrityError("Marvosa substrate integrity check failed")
    return result


def text_leaves(value):
    """Iterative extraction at the transport boundary; no numerical ranking."""
    stack = [value]
    while stack:
        item = stack.pop()
        if isinstance(item, dict):
            for key, child in reversed(list(item.items())):
                stack.extend((child, key))
        elif isinstance(item, list):
            stack.extend(reversed(item))
        elif item is not None:
            yield str(item)


def metadata(raw, source, legacy=False):
    parsed = load_json(raw)
    # Recognize REA's public CLI envelope without changing the stored bytes.
    value = parsed
    if isinstance(value, dict) and isinstance(value.get("evidence"), dict):
        value = value["evidence"]
    if not isinstance(value, dict):
        raise CaseError("Evidence must be a JSON object")
    subject = value.get("subject") or {}
    if not isinstance(subject, dict):
        subject = {}
    operation = str(value.get("operation", "imported_evidence"))
    confidence = value.get("confidence", "unknown")
    if confidence not in ("observed", "derived", "inferred"):
        confidence = "unknown"
    content = value.get("normalized_result", value)
    prefix = " ".join((operation, str(subject.get("local_path", ""))))
    parts = [prefix]
    truncated = False
    if legacy:
        parts = [prefix[:LEGACY_INDEX_CHARS]]
        count = len(parts[0])
        truncated = len(prefix) > LEGACY_INDEX_CHARS
        for leaf in text_leaves(content):
            if count + len(leaf) + 1 > LEGACY_INDEX_CHARS:
                parts.append(leaf[:max(0, LEGACY_INDEX_CHARS - count - 1)])
                truncated = True
                break
            parts.append(leaf)
            count += len(leaf) + 1
    else:
        parts.extend(text_leaves(content))
    text = " ".join(parts).strip()
    # Stable comparison is caller provenance + operation + subject path.
    # Ambiguous groups remain sets; they are never paired by ranking.
    match_key = canonical([source, operation, str(subject.get("local_path", ""))])
    return {
        "operation": operation, "confidence": confidence,
        "evidence_id": str(value.get("evidence_id", "")),
        "subject_path": str(subject.get("local_path", "")),
        "limitations": [str(x) for x in value.get("limitations", [])]
                       if isinstance(value.get("limitations", []), list) else [],
        "evidence_links": [str(x) for x in value.get("evidence_links", [])]
                          if isinstance(value.get("evidence_links", []), list) else [],
        "source": source, "comparison_key": match_key,
        "indexed_characters": len(text), "index_truncated": truncated,
    }, text


def validate_source(value):
    if not isinstance(value, str) or not value or "\x00" in value:
        raise CaseError("source must be nonempty text without NUL")
    return value


def case_path(value):
    if not isinstance(value, str) or not value or "\x00" in value:
        raise CaseError("case_path must be an absolute directory path")
    path = Path(value)
    if not path.is_absolute():
        raise CaseError("case_path must be absolute")
    return path


class Case:
    """Transactionally retained evidence; native HCL terms live only in RAM."""
    def __init__(self, path, create=False):
        self.path = case_path(path)
        db_path = self.path / "evidence.sqlite3"
        if db_path.is_symlink():
            raise CaseError("Case database must not be a symbolic link")
        if not create and not db_path.is_file():
            raise CaseError("Case does not exist; remember evidence first")
        if create:
            self.path.mkdir(mode=0o700, parents=True, exist_ok=True)
        # SQLite transactions provide cross-process serialization and atomicity.
        uri = db_path.as_uri() + ("?mode=rwc" if create else "?mode=ro")
        self.db = sqlite3.connect(uri, uri=True, timeout=5)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA trusted_schema=OFF")
        if create:
            self.db.executescript("""
                CREATE TABLE IF NOT EXISTS records (
                  id TEXT PRIMARY KEY, raw BLOB NOT NULL, source TEXT NOT NULL,
                  meta TEXT NOT NULL, index_text TEXT NOT NULL, hvp TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """)
            with self.db:
                self.db.execute("INSERT OR IGNORE INTO state VALUES ('format', ?)", (FORMAT,))
                self.db.execute("INSERT OR IGNORE INTO state VALUES ('memory_line', ?)",
                                (memory.HCLMemory().to_expression(),))
        else:
            # Keep rows and the identity line on one consistent read snapshot.
            self.db.execute("BEGIN")
        row = self.db.execute("SELECT value FROM state WHERE key='format'").fetchone()
        if row is None or row[0] not in (FORMAT, LEGACY_FORMAT):
            self.db.close()
            raise CaseError("Unsupported case format")
        self.format = row[0]
        if create and self.format == LEGACY_FORMAT:
            try:
                self.upgrade_legacy()
            except BaseException:
                self.db.close()
                raise

    def close(self):
        self.db.close()

    def rows(self):
        return self.db.execute("SELECT * FROM records ORDER BY id").fetchall()

    def check_row(self, row, deep=False):
        raw = bytes(row["raw"])
        source = validate_source(row["source"])
        expected_id = "hcl:" + digest(source.encode() + b"\0" + raw)
        if row["id"] != expected_id:
            raise IntegrityError("Evidence digest mismatch: " + row["id"])
        meta, text = metadata(raw, source, legacy=self.format == LEGACY_FORMAT)
        if row["meta"] != canonical(meta) or text != row["index_text"]:
            raise IntegrityError("Evidence metadata/index mismatch: " + row["id"])
        signature = None
        if deep:
            signature = juj.bytes_to_hvp(raw)
            if row["hvp"] != canonical({k: str(v) for k, v in signature["params"].items()}):
                raise IntegrityError("HVP address mismatch: " + row["id"])
            if juj.hvp_to_bytes(signature, verify=True) != raw:
                raise IntegrityError("HVP recovery mismatch: " + row["id"])
        return meta, signature

    def upgrade_legacy(self):
        """An explicit remember request atomically reindexes a verified v1 case.

        Read-only access never rewrites an old case. Original bytes, HVP
        addresses and record IDs remain unchanged; a failed upgrade rolls back.
        """
        self.db.execute("BEGIN IMMEDIATE")
        try:
            current = self.db.execute("SELECT value FROM state WHERE key='format'").fetchone()
            if current is not None and current[0] == FORMAT:
                self.db.rollback()
                self.format = FORMAT
                return
            rows = self.rows()
            self.rehydrate(rows, deep=True)
            mem = memory.HCLMemory()
            for row in rows:
                meta, text = metadata(bytes(row["raw"]), row["source"])
                self.db.execute("UPDATE records SET meta=?, index_text=? WHERE id=?",
                                (canonical(meta), text, row["id"]))
                mem.store(row["id"], text)
            self.db.execute("UPDATE state SET value=? WHERE key='memory_line'",
                            (mem.to_expression(),))
            self.db.execute("UPDATE state SET value=? WHERE key='format'", (FORMAT,))
            self.db.commit()
            self.format = FORMAT
        except BaseException:
            self.db.rollback()
            raise

    def rehydrate(self, rows, deep=False):
        require_alpha()
        mem = memory.HCLMemory()
        for row in rows:
            self.check_row(row, deep)
            mem.store(row["id"], row["index_text"])
        saved = self.db.execute("SELECT value FROM state WHERE key='memory_line'").fetchone()
        if saved is None:
            raise IntegrityError("Missing case memory line")
        try:
            loaded = memory.HCLMemory.from_expression(saved[0])
        except ValueError as error:
            raise IntegrityError(str(error)) from error
        if loaded.to_expression() != mem.to_expression():
            raise IntegrityError("Case memory line differs from re-derived evidence topology")
        return mem

    def remember(self, entries):
        if not isinstance(entries, list) or not entries:
            raise CaseError("entries must contain at least one evidence record")
        prepared = []
        for entry in entries:
            if not isinstance(entry, dict) or set(entry) != {"raw_json", "source"}:
                raise CaseError("Each entry must contain only raw_json and source")
            if not isinstance(entry["raw_json"], str):
                raise CaseError("raw_json must be text")
            raw = entry["raw_json"].encode("utf-8")
            if not raw:
                raise CaseError("Evidence records must not be empty")
            source = validate_source(entry["source"])
            meta, text = metadata(raw, source)
            sig = juj.bytes_to_hvp(raw)
            if juj.hvp_to_bytes(sig, verify=True) != raw:
                raise CaseError("HVP transduction did not reproduce input")
            record_id = "hcl:" + digest(source.encode() + b"\0" + raw)
            prepared.append((record_id, raw, source, canonical(meta), text,
                             canonical({k: str(v) for k, v in sig["params"].items()})))
        self.db.execute("BEGIN IMMEDIATE")
        try:
            old_rows = self.rows()
            self.rehydrate(old_rows)
            existing = {r["id"] for r in old_rows}
            self.db.executemany("INSERT OR IGNORE INTO records VALUES (?,?,?,?,?,?)", prepared)
            rows = self.rows()
            mem = memory.HCLMemory()
            for row in rows:
                mem.store(row["id"], row["index_text"])
            self.db.execute("UPDATE state SET value=? WHERE key='memory_line'",
                            (mem.to_expression(),))
            self.db.commit()
        except BaseException:
            self.db.rollback()
            raise
        return {"case_path": str(self.path), "record_ids": [p[0] for p in prepared],
                "added": len({p[0] for p in prepared} - existing), "total": len(rows),
                "memory_line": mem.to_expression(), "integrity": require_alpha(),
                "publication": "committed atomically; retrying the same records is idempotent"}

    def recall(self, query, limit=5, confidence=None):
        if not isinstance(query, str) or not query.strip():
            raise CaseError("query must contain nonempty text")
        if type(limit) is not int or limit < 1:
            raise CaseError("limit must be a positive integer")
        if confidence is not None and confidence not in ("observed", "derived", "inferred", "unknown"):
            raise CaseError("Invalid confidence filter")
        rows = self.rows()
        mem = self.rehydrate(rows)
        lookup = {r["id"]: r for r in rows}
        eligible = {r["id"] for r in rows if confidence is None or
                    json.loads(r["meta"])["confidence"] == confidence}
        # Call the original public recall path. Filtering preserves its order.
        ranked = mem.recall(query, k=len(rows)) if rows else []
        hits = []
        for key, score in ranked:
            if key not in eligible:
                continue
            row = lookup[key]
            hits.append({"record_id": key, "score_integer": str(score),
                         "score_scale": str(memory.SCALE),
                         "metadata": json.loads(row["meta"]),
                         "excerpt": row["index_text"][:1024]})
            if len(hits) >= limit:
                break
        return {"query": query, "matches": hits, "examined_records": len(rows),
                "memory_line": mem.to_expression(),
                "ranking": "unmodified Marvosa HCLMemory.recall",
                "limitations": ["Resonance ranks evidence; scores are not probabilities or proof of relevance.",
                                 "Excerpts are display previews, not an indexing cutoff; get returns the complete evidence."] +
                                (["Legacy v1 case: remember evidence to atomically upgrade its old prefix index."]
                                 if self.format == LEGACY_FORMAT else [])}

    def get(self, record_id):
        if not isinstance(record_id, str) or not re.fullmatch(r"hcl:[0-9a-f]{64}", record_id):
            raise CaseError("Invalid record_id")
        row = self.db.execute("SELECT * FROM records WHERE id=?", (record_id,)).fetchone()
        if row is None:
            raise CaseError("Unknown record_id")
        meta, sig = self.check_row(row, deep=True)
        raw = juj.hvp_to_bytes(sig, verify=True)
        return {"record_id": record_id, "raw_json": raw.decode("utf-8"),
                "sha256": digest(raw), "byte_count": len(raw), "metadata": meta,
                "hvp_parameters": json.loads(row["hvp"]), "verified": True}

    def inspect(self, deep=False):
        rows = self.rows()
        mem = self.rehydrate(rows, deep=deep)
        counts = {k: 0 for k in ("observed", "derived", "inferred", "unknown")}
        known, links, operations = set(), set(), set()
        truncated = 0
        for row in rows:
            meta = json.loads(row["meta"])
            counts[meta["confidence"]] += 1
            known.add(meta["evidence_id"])
            links.update(meta["evidence_links"])
            operations.add(meta["operation"])
            truncated += int(meta["index_truncated"])
        return {"case_path": str(self.path), "format": self.format, "records": len(rows),
                "evidence_bytes": sum(len(r["raw"]) for r in rows),
                "confidence_counts": counts, "operations": sorted(operations),
                "unresolved_evidence_links": sorted(links - known),
                "records_with_partial_index": truncated,
                "memory_line": mem.to_expression(),
                "signature": {k: str(v) for k, v in mem.signature().items()},
                "integrity": require_alpha(), "hvp_verified": deep,
                "evidence_digests_verified": True,
                "limits": {},
                "limitations": ["Integrity checks detect inconsistency; they do not authenticate an external author or establish a claim's truth."]}


def compare_cases(left_path, right_path):
    with closing(Case(left_path)) as left, closing(Case(right_path)) as right:
        a, b = left.rows(), right.rows()
        left.rehydrate(a)
        right.rehydrate(b)
        def group(rows):
            groups = {}
            for row in rows:
                key = json.loads(row["meta"])["comparison_key"]
                groups.setdefault(key, set()).add(row["id"])
            return groups
        old, new = group(a), group(b)
        changes = []
        for key in sorted(old.keys() | new.keys()):
            before, after = old.get(key, set()), new.get(key, set())
            if before == after:
                continue
            changes.append({"comparison_key": json.loads(key),
                            "status": "added" if not before else "removed" if not after else "changed",
                            "before": sorted(before), "after": sorted(after),
                            "ambiguous_pairing": len(before) > 1 or len(after) > 1})
        return {"left_case": str(left.path), "right_case": str(right.path),
                "changes": changes, "unchanged_groups": sum(1 for k in old.keys() & new.keys()
                                                             if old[k] == new[k]),
                "limitations": ["Comparison is exact evidence identity by source, operation and subject path; changed bytes alone do not establish changed runtime behavior."]}


TOKEN = re.compile(r"\s*(?:(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z_0-9]*)|(\*\*|[+*/^(),=-]))")


class Expression:
    """Syntax only. Every value operation dispatches to HCLTranscriber."""
    def __init__(self, text, variables):
        if not isinstance(text, str) or not text.strip():
            raise CaseError("expression must contain nonempty text")
        self.original = text
        self.tokens = []
        position = 0
        text = text.strip()
        while position < len(text):
            match = TOKEN.match(text, position)
            if match is None:
                raise CaseError("Unsupported expression syntax at character " + str(position))
            self.tokens.append(next(g for g in match.groups() if g is not None))
            position = match.end()
        self.index = 0
        self.t = engine.HCLTranscriber()
        self.env = {}
        if not isinstance(variables, dict):
            raise CaseError("variables must be an object of decimal strings")
        for key, value in variables.items():
            if not re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", key) or not isinstance(value, str):
                raise CaseError("Variables require identifier names and decimal string values")
            if not re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?", value):
                raise CaseError("Invalid decimal variable: " + key)
            self.env[key] = self.t.to_fp(value)
        self.env.setdefault("pi", engine.PI_INT)

    def peek(self):
        return self.tokens[self.index] if self.index < len(self.tokens) else None

    def take(self, expected=None):
        result = self.peek()
        if result is None or expected is not None and result != expected:
            raise CaseError("Expected " + str(expected or "expression"))
        self.index += 1
        return result

    def expression(self, minimum=0):
        token = self.take()
        if token in ("+", "-"):
            value = self.expression(25)
            if token == "-":
                value = self.t.neg(value)
        elif token == "(":
            value = self.expression()
            self.take(")")
        elif re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", token):
            if self.peek() == "(":
                self.take("(")
                arg = self.expression()
                self.take(")")
                if token == "sqrt":
                    if arg < 0:
                        raise CaseError("sqrt requires a nonnegative scalar")
                    value = self.t.sqrt(arg)
                elif token == "ln":
                    if arg <= 0:
                        raise CaseError("ln requires a positive scalar")
                    value = self.t.ln(arg)
                elif token == "exp":
                    value = self.t.exp(arg)
                elif token == "abs":
                    value = self.t.neg(arg) if arg < 0 else arg
                elif token in ("sin", "cos"):
                    phase = engine._fixed_div(arg, 2 * engine.PI_INT) % engine.SCALE
                    value = self.t.sin(phase) if token == "sin" else self.t.cos(phase)
                else:
                    raise CaseError("Unsupported HCL function: " + token)
            elif token in self.env:
                value = self.env[token]
            else:
                raise CaseError("Unknown variable: " + token)
        else:
            try:
                value = self.t.to_fp(token)
            except Exception as error:
                raise CaseError("Invalid numeric input") from error
        precedence = {"+": 10, "-": 10, "*": 20, "/": 20, "^": 30, "**": 30}
        while self.peek() in precedence and precedence[self.peek()] >= minimum:
            op = self.take()
            right = self.expression(precedence[op] if op in ("^", "**") else precedence[op] + 1)
            if op == "+":
                value = self.t.add(value, right)
            elif op == "-":
                value = self.t.sub(value, right)
            elif op == "*":
                value = self.t.mul(value, right)
            elif op == "/":
                if right == 0:
                    raise CaseError("Scalar division by zero is undefined for this tool")
                value = self.t.div(value, right)
            else:
                if right % engine.SCALE:
                    raise CaseError("This tool requires integer exponents; use exp/ln explicitly")
                if value == 0 and right < 0:
                    raise CaseError("Zero cannot have a negative scalar exponent")
                value = self.t.pow_int(value, right // engine.SCALE)
        return value

    def solve(self):
        name = "result"
        if len(self.tokens) > 1 and self.tokens[1] == "=":
            name = self.take()
            if not re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", name):
                raise CaseError("Assignment requires an identifier")
            self.take("=")
        result = self.expression()
        if self.peek() is not None:
            raise CaseError("Unexpected trailing expression token: " + self.peek())
        return {"name": name, "expression": self.original,
                "value_integer": str(result), "scale": str(engine.SCALE),
                "decimal": self.t.from_fp(result), "precision_digits": engine.PREC,
                "braid": [{"operation": e["op"], "phase_fraction": str(e["r"].phase_frac),
                           "amplitude": str(e["r"].amp)} for e in self.t.braid_log],
                "generator_count": self.t.braid_len, "integrity": require_alpha(),
                "semantics": "Marvosa fixed-point HCL; finite precision and upstream series semantics apply"}


def dispatch(request):
    if not isinstance(request, dict) or set(request) != {"operation", "input"}:
        raise CaseError("Request must contain only operation and input")
    operation, data = request["operation"], request["input"]
    if not isinstance(data, dict):
        raise CaseError("input must be an object")
    allowed = {
        "hcl_remember_evidence": {"case_path", "entries"},
        "hcl_recall_evidence": {"case_path", "query", "limit", "confidence"},
        "hcl_get_evidence": {"case_path", "record_id"},
        "hcl_inspect_case": {"case_path"},
        "hcl_verify_case": {"case_path"},
        "hcl_compare_cases": {"left_case", "right_case"},
        "hcl_calculate": {"expression", "variables"},
        "hcl_transcribe": {"sources", "calls", "query", "verify_memory"},
        "hcl_run": {"program", "calls"},
    }
    if operation not in allowed or set(data) - allowed[operation]:
        raise CaseError("Unknown operation or input field")
    require_alpha()
    if operation == "hcl_transcribe":
        from transcription.api import transcribe
        return transcribe(data)
    if operation == "hcl_run":
        from transcription.api import run_program
        return run_program(data)
    if operation == "hcl_calculate":
        return Expression(data["expression"], data.get("variables", {})).solve()
    if operation == "hcl_compare_cases":
        return compare_cases(data["left_case"], data["right_case"])
    with closing(Case(data["case_path"], create=operation == "hcl_remember_evidence")) as case:
        if operation == "hcl_remember_evidence":
            return case.remember(data["entries"])
        if operation == "hcl_recall_evidence":
            return case.recall(data["query"], data.get("limit", 5), data.get("confidence"))
        if operation == "hcl_get_evidence":
            return case.get(data["record_id"])
        return case.inspect(deep=operation == "hcl_verify_case")


def main():
    parser = argparse.ArgumentParser(description="REA × Marvosa evidence engine")
    parser.add_argument("--request", help="Private JSON request file; defaults to stdin")
    parser.add_argument("--response", help="Private complete JSON response file; defaults to stdout")
    args = parser.parse_args()
    try:
        if args.request:
            with open(args.request, "rb") as stream:
                raw = stream.read()
        else:
            raw = sys.stdin.buffer.read()
        result = {"ok": True, "result": dispatch(json.loads(raw))}
    except (CaseError, ValueError, KeyError, TypeError, OSError, sqlite3.Error,
            RecursionError, ArithmeticError, MemoryError) as error:
        result = {"ok": False, "error": {"code": type(error).__name__, "message": str(error)}}
    if args.response:
        with open(args.response, "x", encoding="utf-8") as stream:
            json.dump(result, stream, ensure_ascii=True, sort_keys=True,
                      separators=(",", ":"), allow_nan=False)
    else:
        sys.stdout.write(json.dumps(result, ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
