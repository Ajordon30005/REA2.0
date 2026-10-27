"""Resident adapter for the original native HCL AI; no MST/model conversion.

Only environment, evidence identity and transport live here. All learning,
ranking, reinforcement, decay, generation and regeneration use upstream code.
Live state stays in RAM for the lifetime of this instance.
"""
from __future__ import annotations

import hashlib
import importlib
import json
from pathlib import Path
import sys

from native_refresh import NativeRefreshBatch

ROOT = Path(__file__).resolve().parent
VENDOR = ROOT / "vendor"


def wire_value(value):
    """Preserve arbitrary-precision native integers across JSON/JS clients."""
    if type(value) is int and abs(value) > 2**53 - 1:
        return str(value)
    if isinstance(value, dict):
        return {key: wire_value(child) for key, child in value.items()}
    if isinstance(value, (list, tuple)):
        return [wire_value(child) for child in value]
    return value


def load_native_ai():
    manifest = json.loads((ROOT / "UPSTREAM.json").read_text())
    for relative, expected in manifest["marvosa"]["files_sha256"].items():
        actual = hashlib.sha256((VENDOR / relative).read_bytes()).hexdigest()
        if actual != expected:
            raise ValueError("Native HCL AI source integrity mismatch: " + relative)
    sys.path.insert(0, str(VENDOR / "mind"))
    module = importlib.import_module("hcl_lm")
    expected_modules = {
        "hcl_lm": VENDOR / "mind/hcl_lm.py",
        "living_memory": VENDOR / "engine/living_memory.py",
        "hcl_engine": VENDOR / "engine/hcl_engine.py",
        "hcl_memory": VENDOR / "engine/hcl_memory.py",
        "juj": VENDOR / "engine/juj.py",
    }
    for name, expected in expected_modules.items():
        actual = Path(sys.modules[name].__file__).resolve()
        if actual != expected.resolve():
            raise ValueError("Mixed HCL runtime module: " + name)
    excluded = {"mst", "mst_equation", "chatmodel", "livemodel", "threemind",
                "transfer", "learn", "hvp_lang"}
    mixed = sorted(name for name in sys.modules if name.split(".")[0] in excluded)
    if mixed:
        raise ValueError("MST/standard-model components in native runtime: " + repr(mixed))
    return module.HCLLanguageModel


class ResidentHCLAI:
    """A native HCLLanguageModel and its living memory, held across calls."""

    def __init__(self):
        self.model = load_native_ai()(revive=False)
        self._evidence = {}

    def experience(self, evidence_id, complete_text):
        if not isinstance(evidence_id, str) or not evidence_id:
            raise ValueError("evidence_id must be nonempty text")
        if not isinstance(complete_text, str) or not complete_text:
            raise ValueError("text must be nonempty complete text")
        digest = hashlib.sha256(complete_text.encode()).hexdigest()
        previous = self._evidence.get(evidence_id)
        if previous is not None and previous != digest:
            raise ValueError("Evidence identity cannot be reused for different content")
        with NativeRefreshBatch(self.model.memory):
            if previous is None:
                self.model.memory.store(evidence_id, complete_text)
                self._evidence[evidence_id] = digest
            else:
                self.model.memory.reinforce(evidence_id)
            learning = self.model.train(complete_text)
        # train reports its signature before the turn has flushed. Return the
        # original native summary after recomposition, never stale metadata.
        learning["signature"] = self.model.memory.signature()
        return {"evidence_id": evidence_id, "sha256": digest,
                "new_evidence": previous is None, "learning": learning}

    def ask(self, prompt, limit=3):
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("prompt must contain text")
        if type(limit) is not int or limit < 1:
            raise ValueError("limit must be positive")
        with NativeRefreshBatch(self.model.memory):
            answer = self.model.interact(prompt, persist=False)
        ranked = self.model.memory.recall(prompt, k=len(self.model.memory.hvp))
        matches = [
            {"evidence_id": key, "phase_rank": phase, "hvp_rank": hvp}
            for key, phase, hvp in ranked if key in self._evidence
        ][:limit]
        return {**answer, "matches": matches}

    def feedback(self, evidence_ids):
        if not isinstance(evidence_ids, list) or any(not isinstance(key, str) for key in evidence_ids):
            raise ValueError("evidence_ids must be a list of text identities")
        if any(key not in self._evidence for key in evidence_ids):
            raise ValueError("Feedback refers to unknown evidence")
        before = self.model.memory.amplitudes()
        for key in dict.fromkeys(evidence_ids):
            self.model.memory.reinforce(key)
        removed = self.model.experience_cycle()
        after = self.model.memory.amplitudes()
        return {"reinforced": list(dict.fromkeys(evidence_ids)),
                "removed_traces": removed,
                "reinforced_in_place": all(after.get(key, 0) > before.get(key, 0)
                                           for key in evidence_ids)}

    def get(self, evidence_id):
        if evidence_id not in self._evidence:
            raise ValueError("Unknown evidence")
        text = self.model.memory.regenerate(evidence_id)
        if text is None or hashlib.sha256(text.encode()).hexdigest() != self._evidence[evidence_id]:
            raise ValueError("Native evidence regeneration failed")
        return text

    def status(self):
        return {"runtime": "native-hcl-ai", "model": "HCLLanguageModel",
                "memory": "LivingMemory", "evidence_records": len(self._evidence),
                "live_traces": len(self.model.memory.vm._terms),
                "depth": self.model.w, "signature": self.model.memory.signature(),
                "integrity": self.model.integrity(), "mst": False,
                "persistence": "resident RAM; no automatic disk writes"}
