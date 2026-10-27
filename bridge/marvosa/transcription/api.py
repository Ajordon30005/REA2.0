"""Shared worker entrypoints for integrated analysis, transcription and execution."""
import hashlib
import base64
import json
from decimal import Decimal
from pathlib import Path

import hcl_engine as engine

from native_ai import load_native_ai
from native_refresh import NativeRefreshBatch
from .compiler import Compiler
from .kernel import input_value, Unsupported
from .runtime import Runtime, SourceError


SEMANTICS = (
    "Original Marvosa HCLTranscriber arithmetic and Boolean compositions; "
    "fixed-point decimal values, not IEEE-754 emulation. Host code owns syntax, "
    "containers, indexing and control. No MST, external model or host execution of target code."
)


def canonical(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False)


def program_digest(program):
    return hashlib.sha256(canonical({key: value for key, value in program.items() if key != "program_sha256"}).encode()).hexdigest()


def engine_identity():
    pin = json.loads((Path(__file__).resolve().parents[1] / "UPSTREAM.json").read_text())["marvosa"]
    return {"name": "Marvosa native HCL-pure", "precision_digits": engine.PREC,
            "source_commit": pin["commit"], "files_sha256": pin["files_sha256"],
            "arrangement_sha256": {name: hashlib.sha256((Path(__file__).parent / name).read_bytes()).hexdigest()
                                    for name in ("kernel.py", "runtime.py", "javascript_values.py", "wasm_runtime.py", "trace.py", "project.py")}, "semantics": SEMANTICS}


def verify_program(program):
    if program.get("format") != "rea-hcl-program/1":
        raise ValueError("Unsupported HCL program format")
    if program.get("program_sha256") != program_digest(program):
        raise ValueError("HCL program digest mismatch")
    if program.get("engine") != engine_identity():
        raise ValueError("Saved program requires a different HCL engine identity or lattice")
    for source in program["sources"]:
        if hashlib.sha256(source["content"].encode()).hexdigest() != source["text_sha256"]:
            raise ValueError("Source text identity mismatch: " + source["path"])
        raw = base64.b64decode(source["content"], validate=True) if source["encoding"] == "base64" else source["content"].encode()
        if len(raw) != source["bytes"] or hashlib.sha256(raw).hexdigest() != source["sha256"]:
            raise ValueError("Source byte identity mismatch: " + source["path"])


def run_calls(program, calls):
    runtime = Runtime(program)
    results = []
    bindings = {}
    for call in calls:
        path = call.get("module") or program.get("project", {}).get("entry_module")
        if path is None:
            if len(program["modules"]) != 1:
                raise ValueError("Select a module path when the program contains multiple modules")
            path = program["modules"][0]["path"]
        start = len(runtime.k.t.braid_log)
        before = set(runtime.executed)
        try:
            args = json.loads(call.get("arguments_json", "[]"), parse_float=Decimal,
                              parse_constant=lambda token: (_ for _ in ()).throw(ValueError("Non-finite number: " + token)))
            kwargs = json.loads(call.get("keywords_json", "{}"), parse_float=Decimal)
            if not isinstance(args, list) or not isinstance(kwargs, dict):
                raise ValueError("arguments_json must be an array; keywords_json must be an object")
            identity = call.get("result_id")
            if identity in bindings:
                raise ValueError("Duplicate result_id: " + identity)
            args = input_value(args)
            for binding in call.get("arguments_from", []):
                index = binding["index"]
                if not 0 <= index < len(args):
                    raise ValueError("Argument binding requires an existing argument slot")
                if binding["result_id"] not in bindings:
                    raise ValueError("Unknown previous result: " + binding["result_id"])
                value = bindings[binding["result_id"]]
                previous, runtime.module = runtime.module, path
                try:
                    for key in binding.get("path", []):
                        value = runtime.read_member(value, key)
                finally:
                    runtime.module = previous
                args[index] = value
            value = runtime.call(path, call["entry"], args, input_value(kwargs),
                                 construct=call.get("construct", False), receiver_id=call.get("receiver_id"), bindings=bindings)
            if not call.get("return_value", True) and identity is None:
                raise ValueError("return_value false requires result_id")
            projection = runtime.output(value) if call.get("return_value", True) else {"type": "reference", "id": identity}
            if identity is not None:
                bindings[identity] = value
            result = {"status": "completed", "value": projection}
        except (Unsupported, SourceError, ValueError, KeyError, IndexError, TypeError, ArithmeticError, RecursionError) as error:
            result = {"status": "unsupported" if isinstance(error, Unsupported) else "error",
                      "error": {"code": type(error).__name__, "message": str(error),
                                "source": getattr(error, "hcl_location", None)}}
        results.append({"module": path, "entry": call["entry"], **result,
                        "braid_start": start, "braid_end": len(runtime.k.t.braid_log),
                        "newly_executed_nodes": sorted(runtime.executed - before)})
    return {"calls": results, "generator_count": runtime.k.t.braid_len,
            "braid": runtime.k.braid(), "braid_sources": runtime.k.braid_sources(),
            "executed_nodes": sorted(runtime.executed)}


def transcribe(data):
    verify_memory = data.get("verify_memory", False)
    if not isinstance(verify_memory, bool):
        raise ValueError("verify_memory must be a boolean")
    load_native_ai()  # Verify the unchanged engine pins and module origins.
    from living_memory import LivingMemory
    memory = LivingMemory()
    sources = data["sources"]
    if len({s["path"] for s in sources}) != len(sources):
        raise ValueError("Duplicate source path")
    # Intake is complete per supplied file, never a prefix or chunked lesson.
    # These source terms exist while the lowering/analysis walk is running.
    with NativeRefreshBatch(memory):
        for source in sources:
            expected = hashlib.sha256(source["content"].encode()).hexdigest()
            if source["text_sha256"] != expected:
                raise ValueError("Source snapshot text digest mismatch")
            memory.store(source["path"], source["content"])
        program = Compiler(sources).compile()
    program["engine"] = engine_identity()
    program["program_sha256"] = program_digest(program)
    query = data.get("query")
    recalled = memory.recall(query, k=len(sources)) if query else []
    verified = all(memory.regenerate(source["path"]) == source["content"] for source in sources) if verify_memory else None
    if verified is False:
        raise ValueError("Native source regeneration failed")
    return {"program": program, "program_sha256": program["program_sha256"],
            "analysis": program["analysis"], "execution": run_calls(program, data.get("calls", [])),
            "working_memory": {"engine": "LivingMemory", "whole_sources": len(sources),
                "source_regeneration_verified": verified, "memory_line": memory.vm.to_expression(),
                "signature": {key: str(value) for key, value in memory.signature().items()},
                "query": query, "matches": [{"path": path, "phase_rank": p, "hvp_rank": h} for path, p, h in recalled]},
            "coverage": {"source_files": len(sources), "source_bytes": sum(s["bytes"] for s in sources),
                         "functions": len(program["analysis"]["functions"]),
                         "mapped_operations": len(program["analysis"]["operations"]),
                         "unknown_syntax": len(program["analysis"]["unknowns"]),
                         "interpretation": "Lowering coverage is syntax coverage, not proof of behavioral equivalence."},
            "limitations": [SEMANTICS,
                "Unknown syntax and unresolved dependencies require adapters. A retained document or binary is not an executable semantic transcription.",
                "Finite precision can differ from a source runtime, including at equality and branch boundaries; verify the intended inputs.",
                "Existing REA provider internals are not rewritten by this command; this integrated source analysis/transcription path uses HCL."]}


def run_program(data):
    load_native_ai()
    program = data["program"]
    verify_program(program)
    return {"program_sha256": program["program_sha256"], "execution": run_calls(program, data["calls"]),
            "limitations": [SEMANTICS, "Only the reported calls and executed nodes were observed."]}
