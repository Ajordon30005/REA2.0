#!/usr/bin/env python3
"""Native HCL AI JSON-lines session; the same instance handles every line."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bridge/marvosa"))
from native_ai import ResidentHCLAI, wire_value


def main():
    ai = ResidentHCLAI()
    for line in sys.stdin:
        try:
            request = json.loads(line)
            operation = request["operation"]
            if operation == "experience":
                result = ai.experience(request["evidence_id"], request["text"])
            elif operation == "ask":
                result = ai.ask(request["prompt"], request.get("limit", 3))
            elif operation == "feedback":
                result = ai.feedback(request["evidence_ids"])
            elif operation == "get":
                result = {"text": ai.get(request["evidence_id"])}
            elif operation == "status":
                result = ai.status()
            else:
                raise ValueError("Unknown operation")
            response = {"ok": True, "result": result}
        except Exception as error:
            response = {"ok": False, "error": {"code": type(error).__name__,
                                                "message": str(error)}}
        print(json.dumps(wire_value(response), ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
