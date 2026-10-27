"""Schedule native summary refreshes at the end of a complete learning turn.

Used by the resident adapter around synchronous original train/interact calls.
Their decisions use
individual traces and input invariants, never the composite memory summary.
Store and reinforce still run verbatim. Native recomposition/signature refresh
runs once at the end, with the exact final trace order and amplitudes.
"""


class NativeRefreshBatch:
    def __init__(self, memory):
        self.memory = memory
        self.requested_recompositions = 0
        self.requested_signatures = 0

    def __enter__(self):
        self.recompose = self.memory._recompose
        self.update = self.memory.vm._update_signature
        self.previous_recompose = self.memory.__dict__.get("_recompose")
        self.previous_update = self.memory.vm.__dict__.get("_update_signature")
        if self.previous_recompose is not None or self.previous_update is not None:
            raise ValueError("Refresh scheduling requires original native methods")
        self.memory._recompose = self.defer_recompose
        self.memory.vm._update_signature = self.defer_update
        return self

    def defer_recompose(self):
        self.requested_recompositions += 1

    def defer_update(self):
        self.requested_signatures += 1

    def __exit__(self, error_type, error, traceback):
        del self.memory._recompose
        del self.memory.vm._update_signature
        if self.requested_recompositions or self.requested_signatures:
            self.recompose()
        return False

    def receipt(self):
        return {"requested_recompositions": self.requested_recompositions,
                "requested_signature_updates": self.requested_signatures,
                "completed_native_recompositions": int(bool(self.requested_recompositions or self.requested_signatures))}
