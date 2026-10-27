"""Execute decoded integer WASM graphs through the original shared HCL Kernel.

32/64-bit wrapping, signed interpretation and traps belong to the source format;
they do not change HCL's precision or its primitives. Bytes, labels, bindings and
container indices are shell representation/control, per hcl-pure/06_porting.md.
"""
import base64
from dataclasses import dataclass

from .kernel import Number, Unsupported


class WasmTrap(ValueError):
    pass


@dataclass
class WasmModule:
    graph: dict


@dataclass
class WasmFunction:
    instance: object
    index: int


class WasmMemory:
    PAGE = 65536

    def __init__(self, limits):
        self.maximum = limits["max"] if limits["max"] is not None else 65536
        self.data = bytearray(limits["min"] * self.PAGE)

    def check(self, offset, count):
        if offset < 0 or count < 0 or offset + count > len(self.data):
            raise WasmTrap("WebAssembly memory access out of bounds")

    def read(self, offset, count):
        self.check(offset, count)
        return self.data[offset:offset + count]

    def write(self, offset, data):
        self.check(offset, len(data))
        self.data[offset:offset + len(data)] = data


class Branch(Exception):
    def __init__(self, depth, values):
        self.depth, self.values = depth, values


class Returned(Exception):
    def __init__(self, values):
        self.values = values


def take(stack, count):
    if not count:
        return []
    values = stack[-count:]
    del stack[-count:]
    return values


class WasmInstance:
    def __init__(self, runtime, module, imports):
        self.runtime, self.k, self.graph = runtime, runtime.k, module.graph
        self.functions, self.tables, self.memories, self.globals = [], [], [], []
        self.data = [base64.b64decode(item["base64"], validate=True) for item in self.graph["data"]]
        self.runtime.executed.add(self.graph["id"])
        for item in self.graph["imports"]:
            if item["kind"] != 0:
                raise Unsupported("WebAssembly non-function import: " + item["module"] + "." + item["name"])
            try:
                namespace = runtime.read_member(imports, item["module"])
                callback = runtime.read_member(namespace, item["name"])
            except (KeyError, Unsupported) as error:
                raise Unsupported("Missing supplied WebAssembly import: " + item["module"] + "." + item["name"]) from error
            from .runtime import Function, Builtin
            if not isinstance(callback, (Function, Builtin, WasmFunction)):
                raise Unsupported("WebAssembly import must be a supplied graph function: " + item["name"])
            self.functions.append({"type_index": item["description"], "callback": callback})
        self.functions.extend(self.graph["functions"])
        for table in self.graph["tables"]:
            if table["type"] != "funcref":
                raise Unsupported("WebAssembly non-function table")
            self.tables.append([None] * table["min"])
        self.memories = [WasmMemory(limits) for limits in self.graph["memories"]]
        for item in self.graph["globals"]:
            self.check_types([item["type"]])
            self.globals.append(self.constant(item["initial"]))
        for element in self.graph["elements"]:
            if element["active"]:
                table = self.tables[element["table"]]
                offset = self.k.integer(self.constant(element["initial"]))
                entries = [self.constant(value) for value in element["entries"]] if element["expressions"] else element["entries"]
                if offset < 0 or offset + len(entries) > len(table):
                    raise WasmTrap("WebAssembly element segment out of bounds")
                table[offset:offset + len(entries)] = entries
        for index, segment in enumerate(self.graph["data"]):
            if segment["active"]:
                self.memories[segment["memory"]].write(self.k.integer(self.constant(segment["initial"])), self.data[index])
                self.data[index] = b""
        self.exports = {}
        for export in self.graph["exports"]:
            kind, index = export["kind"], export["index"]
            if kind == 0:
                value = WasmFunction(self, index)
            elif kind == 2:
                value = self.memories[index]
            elif kind == 3:
                # Read through a live descriptor so global.set is observable.
                from .runtime import LiveBinding
                value = LiveBinding(lambda index=index: self.external(self.globals[index], self.graph["globals"][index]["type"]))
            else:
                continue  # tables are consumed by graph instructions, not JSON
            self.exports[export["name"]] = value
        if self.graph["start"] is not None:
            self.invoke(self.graph["start"], [])

    @staticmethod
    def check_types(types):
        if any(item not in ("i32", "i64", "funcref", "externref") for item in types):
            raise Unsupported("WebAssembly floating-point signature requires an explicit HCL semantic adapter")

    def constant(self, body):
        stack = []
        self.sequence(body, stack, [], [], 0)
        if len(stack) != 1:
            raise ValueError("WebAssembly initializer must produce one value")
        return stack[0]

    def wrap(self, value, width):
        self.k.integer(value)
        modulus = self.k.number(1 << width)
        if 0 <= value.value < modulus.value:
            return value
        return self.k.binary("%", value, modulus, "python")

    def signed(self, value, width):
        if value.value >= self.k.number(1 << (width - 1)).value:
            return Number(self.k.t.sub(value.value, self.k.number(1 << width).value))
        return value

    def external(self, value, type_):
        return self.signed(value, int(type_[1:])) if type_ in ("i32", "i64") else value

    def signature(self, index):
        return self.graph["types"][self.functions[index]["type_index"]]

    def invoke(self, index, args):
        fn, signature = self.functions[index], self.signature(index)
        self.check_types(signature["params"] + signature["results"])
        if len(args) != len(signature["params"]):
            raise TypeError("WebAssembly function argument count mismatch")
        args = [self.wrap(value, int(type_[1:])) if type_ in ("i32", "i64") else value
                for value, type_ in zip(args, signature["params"])]
        if "callback" in fn:
            external = [self.external(value, type_) for value, type_ in zip(args, signature["params"])]
            result = self.runtime.invoke(fn["callback"], external)
            values = [] if not signature["results"] else [result] if len(signature["results"]) == 1 else list(result)
            if len(values) != len(signature["results"]):
                raise TypeError("WebAssembly imported function result count mismatch")
            return [self.wrap(value, int(type_[1:])) if type_ in ("i32", "i64") else value
                    for value, type_ in zip(values, signature["results"])]
        self.runtime.executed.add(fn["id"])
        locals_ = list(args)
        for item in fn["locals"]:
            self.check_types([item["type"]])
            locals_.extend([self.k.number(0) if item["type"] in ("i32", "i64") else None] * item["count"])
        stack, results = [], len(signature["results"])
        try:
            self.sequence(fn["body"], stack, locals_, [results], results)
        except Returned as returned:
            return returned.values
        except Branch as branch:
            if branch.depth:
                raise ValueError("WebAssembly branch escaped function") from branch
            return branch.values
        return take(stack, results)

    def call(self, index, args):
        values = self.invoke(index, args)
        result_types = self.signature(index)["results"]
        values = [self.external(value, type_) for value, type_ in zip(values, result_types)]
        return None if not values else values[0] if len(values) == 1 else values

    def block_signature(self, code):
        if code == -64:
            return {"params": [], "results": []}
        if code < 0:
            from .wasm import TYPES
            return {"params": [], "results": [TYPES[code + 128]]}
        return self.graph["types"][code]

    def sequence(self, body, stack, locals_, labels, returns):
        for n in body:
            previous = self.runtime.location
            self.runtime.location = n["id"]
            self.runtime.executed.add(n["id"])
            start = len(self.k.t.braid_log)
            try:
                if n["kind"] == "unknown":
                    raise Unsupported("Unlowered WebAssembly instruction: " + n["op"])
                self.instruction(n, stack, locals_, labels, returns)
            except (Unsupported, ValueError, TypeError, IndexError, ArithmeticError) as error:
                if not getattr(error, "hcl_location", None):
                    error.hcl_location = n["id"]
                raise
            finally:
                self.k.record(start, n["id"])
                self.runtime.location = previous

    def instruction(self, n, stack, locals_, labels, returns):
        op = n["op"]
        if op == "unreachable":
            raise WasmTrap("WebAssembly unreachable")
        if op == "nop":
            return
        if op in ("block", "loop", "if"):
            condition = self.k.integer(stack.pop()) if op == "if" else 1
            signature = self.block_signature(n["block_type"])
            self.check_types(signature["params"] + signature["results"])
            base = len(stack) - len(signature["params"])
            arity = len(signature["params"] if op == "loop" else signature["results"])
            while True:
                try:
                    self.sequence(n["body"] if condition else n["else_body"], stack, locals_, labels + [arity], returns)
                except Branch as branch:
                    if branch.depth:
                        branch.depth -= 1
                        raise
                    stack[base:] = branch.values
                    if op == "loop":
                        continue
                else:
                    values = take(stack, len(signature["results"]))
                    stack[base:] = values
                break
            return
        if op in ("br", "br_if", "br_table"):
            if op == "br_if" and not self.k.integer(stack.pop()):
                return
            if op == "br_table":
                index = self.k.integer(stack.pop())
                depth = n["labels"][index] if index < len(n["labels"]) else n["default"]
            else:
                depth = n["index"]
            raise Branch(depth, take(stack, labels[-1 - depth]))
        if op == "return":
            raise Returned(take(stack, returns))
        if op in ("call", "call_indirect"):
            if op == "call_indirect":
                index = self.k.integer(stack.pop())
                table = self.tables[n["table_index"]]
                if not 0 <= index < len(table) or table[index] is None:
                    raise WasmTrap("WebAssembly indirect call to uninitialized/out-of-bounds element")
                index = table[index]
                if self.signature(index) != self.graph["types"][n["type_index"]]:
                    raise WasmTrap("WebAssembly indirect call type mismatch")
            else:
                index = n["index"]
            stack.extend(self.invoke(index, take(stack, len(self.signature(index)["params"]))))
            return
        if op == "drop":
            stack.pop()
            return
        if op == "select":
            condition, right, left = stack.pop(), stack.pop(), stack.pop()
            stack.append(left if self.k.integer(condition) else right)
            return
        if op.startswith("local."):
            index = n["index"]
            if op == "local.get":
                stack.append(locals_[index])
            else:
                locals_[index] = stack[-1] if op == "local.tee" else stack.pop()
            return
        if op.startswith("global."):
            if op == "global.get":
                stack.append(self.globals[n["index"]])
            else:
                self.globals[n["index"]] = stack.pop()
            return
        if op.startswith("table."):
            table = self.tables[n["index"]]
            value = stack.pop() if op == "table.set" else None
            index = self.k.integer(stack.pop())
            if not 0 <= index < len(table):
                raise WasmTrap("WebAssembly table index out of bounds")
            if op == "table.set":
                table[index] = value
            else:
                stack.append(table[index])
            return
        if op.startswith("ref."):
            stack.append(None if op == "ref.null" else n["index"] if op == "ref.func" else self.k.number(int(stack.pop() is None)))
            return
        if op.startswith("memory.") or op == "data.drop":
            return self.memory_instruction(n, stack)
        if ".load" in op or ".store" in op:
            width = int(op[1:3])
            name = op.split(".")[1]
            store = name.startswith("store")
            tail = name[5:] if store else name[4:]
            bits = int(tail.split("_")[0]) if tail else width
            value = stack.pop() if store else None
            address = self.k.binary("+", stack.pop(), self.k.number(n["offset"]))
            address = self.k.integer(address)
            memory = self.memories[0]
            if store:
                memory.write(address, self.k.integer(self.wrap(value, bits)).to_bytes(bits // 8, "little"))
            else:
                value = self.k.number(int.from_bytes(memory.read(address, bits // 8), "little"))
                if tail.endswith("_s"):
                    value = self.signed(value, bits)
                stack.append(self.wrap(value, width))
            return
        if op.startswith(("i32.", "i64.")):
            width, name = int(op[1:3]), op[4:]
            if name == "const":
                stack.append(self.wrap(self.k.number(n["value"]), width))
                return
            if name.startswith(("wrap_", "extend")):
                value = stack.pop()
                if name.endswith("_s"):
                    source_width = 32 if "i32" in name else int(name[6:-2])
                    value = self.signed(self.wrap(value, source_width), source_width)
                stack.append(self.wrap(value, width))
                return
            right = None if name in ("eqz", "clz", "ctz", "popcnt") else stack.pop()
            left = stack.pop()
            if name == "eqz":
                result = self.k.number(int(self.k.binary("==", left, self.k.number(0))))
            elif name in ("clz", "ctz", "popcnt", "and", "or", "xor", "shl", "shr_s", "shr_u", "rotl", "rotr"):
                word_op = {"and": "&", "or": "|", "xor": "^", "shl": "<<", "shr_s": ">>", "shr_u": ">>>"}.get(name, name)
                result = self.k.word(word_op, left, right, "wasm", width=width, signed=False)
            else:
                if name.endswith("_s"):
                    left, right = self.signed(left, width), self.signed(right, width)
                if name.startswith(("div_", "rem_")):
                    if not right.value:
                        raise WasmTrap("WebAssembly integer divide by zero")
                    if name == "div_s" and self.k.integer(left) == -(1 << (width - 1)) and self.k.integer(right) == -1:
                        raise WasmTrap("WebAssembly integer overflow")
                    result = self.k.binary("//" if name.startswith("div") else "%", left, right, "javascript")
                elif name in ("add", "sub", "mul"):
                    result = self.k.binary({"add": "+", "sub": "-", "mul": "*"}[name], left, right)
                else:
                    compare = {"eq": "==", "ne": "!=", "lt": "<", "gt": ">", "le": "<=", "ge": ">="}
                    if name.split("_")[0] not in compare:
                        raise Unsupported("WebAssembly integer instruction: " + op)
                    result = self.k.number(int(self.k.binary(compare[name.split("_")[0]], left, right)))
            stack.append(self.wrap(result, width))
            return
        raise Unsupported("WebAssembly instruction: " + op)

    def memory_instruction(self, n, stack):
        op = n["op"]
        if op == "data.drop":
            self.data[n["data_index"]] = b""
        elif op == "memory.size":
            stack.append(self.k.number(len(self.memories[n["index"]].data) // WasmMemory.PAGE))
        elif op == "memory.grow":
            memory = self.memories[n["index"]]
            delta = self.k.integer(stack.pop())
            previous = len(memory.data) // WasmMemory.PAGE
            if delta > memory.maximum - previous:
                stack.append(self.k.number((1 << 32) - 1))
                return
            try:
                memory.data.extend(bytearray(delta * WasmMemory.PAGE))
            except (MemoryError, OverflowError):
                stack.append(self.k.number((1 << 32) - 1))
                return
            stack.append(self.k.number(previous))
        else:
            count, source, destination = (self.k.integer(stack.pop()) for _ in range(3))
            if op == "memory.copy":
                value = self.memories[n["source"]].read(source, count)
                self.memories[n["destination"]].write(destination, value)
            elif op == "memory.fill":
                memory = self.memories[n["memory_index"]]
                memory.check(destination, count)
                byte = self.k.integer(self.wrap(self.k.number(source), 8))
                memory.write(destination, bytes([byte]) * count)
            elif op == "memory.init":
                data = self.data[n["data_index"]]
                if source < 0 or source + count > len(data):
                    raise WasmTrap("WebAssembly data segment out of bounds")
                self.memories[n["memory_index"]].write(destination, data[source:source + count])
            else:
                raise Unsupported("WebAssembly bulk memory instruction: " + op)
