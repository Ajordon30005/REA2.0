#!/usr/bin/env python3
"""Standalone HCL case CLI. Runs in-process; never starts analysis targets."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bridge" / "marvosa"))
from rea_hcl import dispatch, CaseError


def main():
    parser = argparse.ArgumentParser(description="REA × Marvosa — local HCL case tools")
    commands = parser.add_subparsers(dest="command", required=True)
    calculate = commands.add_parser("calculate", help="Calculate through native HCL operations")
    calculate.add_argument("expression")
    calculate.add_argument("--variable", action="append", default=[])
    remember = commands.add_parser("remember", help="Retain a JSON evidence file")
    remember.add_argument("case")
    remember.add_argument("file")
    remember.add_argument("--source")
    recall = commands.add_parser("recall", help="Recall by HCL resonance")
    recall.add_argument("case")
    recall.add_argument("query")
    recall.add_argument("--limit", type=int, default=5)
    recall.add_argument("--confidence", choices=["observed", "derived", "inferred", "unknown"])
    get = commands.add_parser("get", help="Recover exact JSON with HVP verification")
    get.add_argument("case")
    get.add_argument("record_id")
    for name in ("inspect", "verify"):
        commands.add_parser(name).add_argument("case")
    compare = commands.add_parser("compare")
    compare.add_argument("left")
    compare.add_argument("right")
    args = parser.parse_args()
    try:
        operations = {"calculate":"hcl_calculate", "remember":"hcl_remember_evidence",
                      "recall":"hcl_recall_evidence", "get":"hcl_get_evidence",
                      "inspect":"hcl_inspect_case", "verify":"hcl_verify_case", "compare":"hcl_compare_cases"}
        data = {}
        if hasattr(args, "case"):
            data["case_path"] = str(Path(args.case).resolve())
        if args.command == "calculate":
            variables = {}
            for item in args.variable:
                name, delimiter, value = item.partition("=")
                if not delimiter or name in variables:
                    raise CaseError("Use unique NAME=DECIMAL variable bindings")
                variables[name] = value
            data = {"expression":args.expression,"variables":variables}
        elif args.command == "remember":
            path = Path(args.file).resolve()
            with path.open("rb") as stream:
                raw = stream.read()
            data["entries"] = [{"source":args.source or str(path), "raw_json":raw.decode("utf-8")}]
        elif args.command == "recall":
            data.update(query=args.query, limit=args.limit)
            if args.confidence:
                data["confidence"] = args.confidence
        elif args.command == "get":
            data["record_id"] = args.record_id
        elif args.command == "compare":
            data = {"left_case":str(Path(args.left).resolve()), "right_case":str(Path(args.right).resolve())}
        print(json.dumps(dispatch({"operation":operations[args.command],"input":data}), ensure_ascii=False, indent=2))
    except (ValueError, KeyError, OSError, ArithmeticError) as error:
        print(json.dumps({"error":str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
