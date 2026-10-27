"""Lossless transport of complete native braids; never truncation or sampling.

Every original generator is encoded as it is emitted. The word stays complete,
without keeping millions of expanded Python dictionaries until delivery.
"""
import base64
import hashlib
import json
import zlib


class TraceBuffer:
    """Append-only, lossless record owner with non-destructive snapshots.

    No file handles, background jobs, samples, quotas or arithmetic shortcuts.
    Compression is representation only. Snapshotting leaves the encoder live.
    """
    def __init__(self, record_type):
        self.record_type = record_type
        self.clear()

    def clear(self):
        self.compressor = zlib.compressobj(wbits=31)
        self.compressed = bytearray()
        self.digest = hashlib.sha256()
        self.count = self.size = 0

    def append(self, record):
        if self.record_type == "generator":
            record = {"operation": record["op"], "phase_fraction": str(record["r"].phase_frac),
                      "amplitude": str(record["r"].amp)}
        line = (json.dumps(record, ensure_ascii=True, separators=(",", ":")) + "\n").encode("ascii")
        self.digest.update(line)
        self.size += len(line)
        self.count += 1
        self.compressed.extend(self.compressor.compress(line))

    def __len__(self):
        return self.count

    def packed(self):
        data = self.compressed + self.compressor.copy().flush()
        return {"format": "rea-hcl-trace/1", "encoding": "gzip-jsonl", "codec": "zlib/" + zlib.ZLIB_RUNTIME_VERSION,
                "record_type": self.record_type, "record_count": self.count,
                "uncompressed_bytes": self.size, "sha256": self.digest.hexdigest(),
                "base64": base64.b64encode(data).decode("ascii")}

    def __iter__(self):
        for record in unpack(self.packed()):
            if self.record_type == "generator":
                from hcl_engine import FBit
                yield {"op": record["operation"], "r": FBit(int(record["phase_fraction"]), int(record["amplitude"]))}
            else:
                yield record


def pack(records, record_type):
    # Public records already have the projection used on the wire.
    buffer = TraceBuffer("source")
    for record in records:
        buffer.append(record)
    buffer.record_type = record_type
    return buffer.packed()


def unpack(trace):
    """Stream and authenticate a complete trace; no additional numeric runtime."""
    if isinstance(trace, list):
        yield from trace  # Historical expanded reports remain readable.
        return
    import gzip
    import io
    if trace.get("format") != "rea-hcl-trace/1" or trace.get("encoding") != "gzip-jsonl":
        raise ValueError("Unknown HCL trace encoding")
    data = base64.b64decode(trace["base64"], validate=True)
    digest = hashlib.sha256()
    count = size = 0
    with gzip.GzipFile(fileobj=io.BytesIO(data), mode="rb") as stream:
        for line in stream:
            digest.update(line)
            size += len(line)
            count += 1
            yield json.loads(line)
    if (count != trace["record_count"] or size != trace["uncompressed_bytes"] or
            digest.hexdigest() != trace["sha256"]):
        raise ValueError("HCL trace digest/count/length mismatch")
