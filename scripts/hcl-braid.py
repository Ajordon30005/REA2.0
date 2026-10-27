#!/usr/bin/env python3
"""Recover and verify every generator or source range from a saved HCL report."""
import argparse
import gzip
import json
from pathlib import Path
import sys
import tempfile
import shutil

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bridge/marvosa"))
from transcription.trace import unpack


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("--analysis", action="store_true")
    parser.add_argument("--sources", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    opener = gzip.open if args.report.suffix == ".gz" else open
    with opener(args.report, "rt", encoding="utf8") as stream:
        report = json.load(stream)
    report = report.get("evidence", report)
    report = report.get("normalized_result", report)
    owner = report["analysis" if args.analysis else "execution"]
    trace = owner["braid_sources" if args.sources else "braid"]
    # Stage the result so a failed digest never publishes a partial verified file.
    with tempfile.TemporaryFile(mode="w+t", encoding="utf8") as staged:
        for record in unpack(trace):
            staged.write(json.dumps(record, ensure_ascii=True, separators=(",", ":")) + "\n")
        staged.seek(0)
        if args.output:
            with args.output.open("x", encoding="utf8") as target:
                shutil.copyfileobj(staged, target)
        else:
            shutil.copyfileobj(staged, sys.stdout)


if __name__ == "__main__":
    main()
