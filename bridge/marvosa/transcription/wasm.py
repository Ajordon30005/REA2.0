"""WebAssembly binary boundary -> the same HCL graph and analysis owner.

Decoding is inert format work. No native WebAssembly engine executes a target.
Full original bytes stay in program.sources; instruction offsets identify the
exact bytes that emitted each graph node. Unsupported proposals remain explicit.
"""
import base64

from .kernel import Unsupported


TYPES = {0x7f: "i32", 0x7e: "i64", 0x7d: "f32", 0x7c: "f64", 0x70: "funcref", 0x6f: "externref"}
OPS = {0: "unreachable", 1: "nop", 2: "block", 3: "loop", 4: "if",
       0xc: "br", 0xd: "br_if", 0xe: "br_table", 0xf: "return",
       0x10: "call", 0x11: "call_indirect", 0x1a: "drop", 0x1b: "select", 0x1c: "select",
       0x20: "local.get", 0x21: "local.set", 0x22: "local.tee",
       0x23: "global.get", 0x24: "global.set", 0x25: "table.get", 0x26: "table.set",
       0x3f: "memory.size", 0x40: "memory.grow", 0x41: "i32.const", 0x42: "i64.const",
       0x43: "f32.const", 0x44: "f64.const", 0xd0: "ref.null", 0xd1: "ref.is_null", 0xd2: "ref.func"}
MEMORY = ["i32.load", "i64.load", "f32.load", "f64.load", "i32.load8_s", "i32.load8_u",
          "i32.load16_s", "i32.load16_u", "i64.load8_s", "i64.load8_u", "i64.load16_s",
          "i64.load16_u", "i64.load32_s", "i64.load32_u", "i32.store", "i64.store",
          "f32.store", "f64.store", "i32.store8", "i32.store16", "i64.store8", "i64.store16", "i64.store32"]
OPS.update(enumerate(MEMORY, 0x28))
COMPARE = ["eqz", "eq", "ne", "lt_s", "lt_u", "gt_s", "gt_u", "le_s", "le_u", "ge_s", "ge_u"]
INTEGER = ["clz", "ctz", "popcnt", "add", "sub", "mul", "div_s", "div_u", "rem_s", "rem_u",
           "and", "or", "xor", "shl", "shr_s", "shr_u", "rotl", "rotr"]
for start, prefix, names in ((0x45, "i32", COMPARE), (0x50, "i64", COMPARE),
                             (0x67, "i32", INTEGER), (0x79, "i64", INTEGER)):
    OPS.update((start + i, prefix + "." + name) for i, name in enumerate(names))
CONVERSIONS = ["i32.wrap_i64", "i32.trunc_f32_s", "i32.trunc_f32_u", "i32.trunc_f64_s", "i32.trunc_f64_u",
               "i64.extend_i32_s", "i64.extend_i32_u", "i64.trunc_f32_s", "i64.trunc_f32_u", "i64.trunc_f64_s",
               "i64.trunc_f64_u", "f32.convert_i32_s", "f32.convert_i32_u", "f32.convert_i64_s",
               "f32.convert_i64_u", "f32.demote_f64", "f64.convert_i32_s", "f64.convert_i32_u",
               "f64.convert_i64_s", "f64.convert_i64_u", "f64.promote_f32", "i32.reinterpret_f32",
               "i64.reinterpret_f64", "f32.reinterpret_i32", "f64.reinterpret_i64",
               "i32.extend8_s", "i32.extend16_s", "i64.extend8_s", "i64.extend16_s", "i64.extend32_s"]
OPS.update(enumerate(CONVERSIONS, 0xa7))
for i in range(0x5b, 0x67):
    OPS[i] = "float.compare." + hex(i)
for i in range(0x8b, 0xa7):
    OPS[i] = "float.numeric." + hex(i)


class Reader:
    def __init__(self, data, offset=0):
        self.data, self.pos, self.offset = data, 0, offset

    def take(self, size):
        if size < 0 or self.pos + size > len(self.data):
            raise ValueError("Truncated WebAssembly at byte " + str(self.offset + self.pos))
        value = self.data[self.pos:self.pos + size]
        self.pos += size
        return value

    def byte(self):
        return self.take(1)[0]

    def integer(self, bits=32, signed=False):
        result, shift = 0, 0
        while True:
            b = self.byte()
            result |= (b & 127) << shift
            shift += 7
            if not b & 128:
                if signed and b & 64:
                    result -= 1 << shift
                low, high = (-(1 << (bits - 1)), 1 << (bits - 1)) if signed else (0, 1 << bits)
                if not low <= result < high:
                    raise ValueError("WebAssembly integer exceeds its encoded type")
                return result
            if shift >= bits:
                raise ValueError("WebAssembly LEB128 exceeds its encoded type")

    def vector(self, read):
        return [read() for _ in range(self.integer())]

    def name(self):
        return self.take(self.integer()).decode("utf8")

    def value_type(self):
        code = self.byte()
        if code not in TYPES:
            raise Unsupported("WebAssembly value type " + hex(code))
        return TYPES[code]

    def limits(self):
        flags = self.integer()
        if flags not in (0, 1):
            raise Unsupported("WebAssembly shared/memory64 limits require an adapter")
        return {"min": self.integer(), "max": self.integer() if flags else None}

    def table(self):
        return {"type": self.value_type(), **self.limits()}

    def global_type(self):
        return {"type": self.value_type(), "mutable": bool(self.byte())}

    def done(self):
        if self.pos != len(self.data):
            raise ValueError("Unconsumed WebAssembly section/body bytes")


def primitive(op):
    name = op.split(".", 1)[-1]
    if name in ("add", "sub"):
        return "COMP" if name == "add" else "COMP/SHIFT"
    if name == "mul":
        return "AMP_MOD"
    if name.startswith(("div_", "rem_")):
        return "COMP/SHIFT quotient-remainder"
    if name in ("and", "or", "xor"):
        return "COMP/SHIFT/AMP_MOD Boolean gates"
    if name in ("clz", "ctz", "popcnt", "shl", "shr_s", "shr_u", "rotl", "rotr"):
        return "bit permutation/COMP/AMP_MOD"
    if name in COMPARE or name.startswith(("wrap_", "extend")):
        return "COMP/SHIFT word interpretation"
    if ".load" in op or ".store" in op:
        return "COMP address/byte representation"
    return None


class WasmFrontend:
    def __init__(self, compiler):
        self.c = compiler

    def expression(self, r, allow_else=False):
        nodes = []
        while True:
            offset = r.offset + r.pos
            code = r.byte()
            if code == 0xb or code == 5 and allow_else:
                return nodes, code
            op = OPS.get(code)
            fields = {}
            if code in (2, 3, 4):
                blocktype = r.integer(33, True)
                fields["block_type"] = blocktype
                fields["body"], end = self.expression(r, code == 4)
                fields["else_body"] = self.expression(r)[0] if end == 5 else []
            elif code in (0xc, 0xd, 0x10, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x3f, 0x40, 0xd2):
                fields["index"] = r.integer()
            elif code == 0xe:
                fields.update(labels=r.vector(r.integer), default=r.integer())
            elif code == 0x11:
                fields.update(type_index=r.integer(), table_index=r.integer())
            elif code == 0x1c:
                fields["types"] = r.vector(r.value_type)
            elif 0x28 <= code <= 0x3e:
                fields.update(align=r.integer(), offset=r.integer())
                if fields["align"] & 64:
                    raise Unsupported("WebAssembly multi-memory load/store encoding")
            elif code in (0x41, 0x42):
                fields["value"] = str(r.integer(32 if code == 0x41 else 64, True))
            elif code in (0x43, 0x44):
                fields["bits_hex"] = r.take(4 if code == 0x43 else 8).hex()
            elif code == 0xd0:
                fields["heap_type"] = r.integer(33, True)
            elif code == 0xfc:
                sub = r.integer()
                bulk = {8: ("memory.init", ("data_index", "memory_index")), 9: ("data.drop", ("data_index",)),
                        10: ("memory.copy", ("destination", "source")), 11: ("memory.fill", ("memory_index",))}
                if sub not in bulk:
                    raise Unsupported("WebAssembly prefixed opcode 0xfc/" + str(sub))
                op, indices = bulk[sub]
                fields.update((key, r.integer()) for key in indices)
            if op is None:
                raise Unsupported("WebAssembly opcode " + hex(code) + " at byte " + str(offset))
            location = {"byte_offset": offset, "byte_end": r.offset + r.pos}
            floating = "f32" in op or "f64" in op or op.startswith("float.")
            if floating:
                node = self.c.unknown(op, location, "IEEE floating-point instruction requires an explicit HCL semantic adapter")
                node.update(op=op, **fields)
            else:
                node = self.c.node("wasm_instruction", location, op=op, **fields)
                mapped = primitive(op)
                if mapped:
                    node["primitive"] = mapped
                    self.c.operations.append({"id": node["id"], "scope": self.c.scope, "operator": op, "primitive": mapped})
                if op in ("call", "call_indirect"):
                    self.c.calls.append({"id": node["id"], "scope": self.c.scope,
                                         "target": "$func" + str(fields["index"]) if op == "call" else "<table>"})
            nodes.append(node)

    def lower(self):
        r = Reader(base64.b64decode(self.c.current["content"], validate=True))
        if r.take(8) != b"\0asm\1\0\0\0":
            raise ValueError("Unsupported WebAssembly magic/version")
        module = {"types": [], "imports": [], "functions": [], "tables": [], "memories": [],
                  "globals": [], "exports": [], "elements": [], "data": [], "start": None}
        function_types = []
        while r.pos < len(r.data):
            section = r.byte()
            size = r.integer()
            offset = r.pos
            s = Reader(r.take(size), offset)
            if section == 0:
                continue  # custom metadata stays in full original bytes
            if section == 1:
                def type_entry():
                    if s.byte() != 0x60:
                        raise Unsupported("WebAssembly non-function type")
                    return {"params": s.vector(s.value_type), "results": s.vector(s.value_type)}
                module["types"] = s.vector(type_entry)
            elif section == 2:
                def import_entry():
                    item = {"module": s.name(), "name": s.name(), "kind": s.byte()}
                    readers = {0: s.integer, 1: s.table, 2: s.limits, 3: s.global_type}
                    if item["kind"] not in readers:
                        raise Unsupported("WebAssembly import kind")
                    item["description"] = readers[item["kind"]]()
                    return item
                module["imports"] = s.vector(import_entry)
            elif section == 3:
                function_types = s.vector(s.integer)
            elif section == 4:
                module["tables"] = s.vector(s.table)
            elif section == 5:
                module["memories"] = s.vector(s.limits)
            elif section == 6:
                module["globals"] = s.vector(lambda: {**s.global_type(), "initial": self.expression(s)[0]})
            elif section == 7:
                module["exports"] = s.vector(lambda: {"name": s.name(), "kind": s.byte(), "index": s.integer()})
            elif section == 8:
                module["start"] = s.integer()
            elif section == 9:
                def element():
                    flags = s.integer()
                    if flags > 7:
                        raise Unsupported("WebAssembly element segment flags")
                    active = flags in (0, 2, 4, 6)
                    table = s.integer() if flags in (2, 6) else 0
                    initial = self.expression(s)[0] if active else []
                    if flags in (1, 2, 3) and s.byte() != 0:
                        raise Unsupported("WebAssembly element kind")
                    value_type = s.value_type() if flags in (5, 6, 7) else "funcref"
                    if value_type != "funcref":
                        raise Unsupported("WebAssembly external-reference element")
                    entries = s.vector(lambda: self.expression(s)[0]) if flags & 4 else s.vector(s.integer)
                    return {"active": active, "table": table, "initial": initial, "expressions": bool(flags & 4), "entries": entries}
                module["elements"] = s.vector(element)
            elif section == 10:
                count = s.integer()
                if count != len(function_types):
                    raise ValueError("WebAssembly function/code count mismatch")
                imports = sum(item["kind"] == 0 for item in module["imports"])
                for index, type_index in enumerate(function_types):
                    body_size = s.integer()
                    body_offset = s.offset + s.pos
                    body = Reader(s.take(body_size), body_offset)
                    locals_ = body.vector(lambda: {"count": body.integer(), "type": body.value_type()})
                    self.c.scope = "$func" + str(imports + index)
                    instructions = self.expression(body)[0]
                    body.done()
                    fn = self.c.node("wasm_function", {"byte_offset": body_offset, "byte_end": body_offset + body_size},
                                     type_index=type_index, locals=locals_, body=instructions)
                    module["functions"].append(fn)
                    self.c.functions.append({"id": fn["id"], "name": self.c.scope, "path": self.c.current["path"],
                                             "parameters": [str(i) for i in range(len(module["types"][type_index]["params"]))]})
                self.c.scope = "<module>"
            elif section == 11:
                def data_entry():
                    flags = s.integer()
                    if flags not in (0, 1, 2):
                        raise Unsupported("WebAssembly data segment flags")
                    memory = s.integer() if flags == 2 else 0
                    initial = self.expression(s)[0] if flags != 1 else []
                    data = s.take(s.integer())
                    return {"active": flags != 1, "memory": memory, "initial": initial,
                            "base64": base64.b64encode(data).decode("ascii")}
                module["data"] = s.vector(data_entry)
            elif section == 12:
                module["data_count"] = s.integer()
            else:
                raise Unsupported("WebAssembly section " + str(section))
            s.done()
        return self.c.node("wasm_module", {"byte_offset": 0, "byte_end": len(r.data)}, **module)
