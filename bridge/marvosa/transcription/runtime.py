"""Execute the emitted graph with HCL values and inert host control/I/O glue.

There is no eval, exec, target import, subprocess, network or filesystem API in
the graph's environment. A target call resolves to another graph function or a
named boundary below. Unknown dependencies remain unknown, never host fallback.
"""
from dataclasses import dataclass, field

import hcl_engine as engine

from .kernel import Kernel, Number, Unsupported, output_value
from .javascript_values import JSObject, JSArray, JSClass, Property, TypedArray
from .wasm_runtime import WasmModule, WasmFunction, WasmMemory, WasmInstance
from .project import Project


class Undefined:
    def __bool__(self):
        return False


UNDEFINED = Undefined()
UNINITIALIZED = object()


class Return(Exception):
    def __init__(self, value):
        self.value = value


class Break(Exception):
    def __init__(self, label=None):
        self.label = label


class Continue(Exception):
    def __init__(self, label=None):
        self.label = label


class SourceError(ValueError):
    def __init__(self, value):
        self.value = value
        super().__init__(str(value))


@dataclass
class LiveBinding:
    read: object


class Env:
    def __init__(self, parent=None, function=False):
        self.values = {}
        self.constants = set()
        self.parent = parent
        self.function = function

    def owner(self, name):
        current = self
        while current is not None:
            if name in current.values:
                return current
            current = current.parent
        raise Unsupported("Unresolved source binding: " + name)

    def get(self, name):
        value = self.owner(name).values[name]
        if value is UNINITIALIZED:
            raise SourceError("Binding accessed before initialization: " + name)
        return value.read() if isinstance(value, LiveBinding) else value

    def var_owner(self):
        current = self
        while current.parent is not None and not current.function:
            current = current.parent
        return current


@dataclass(eq=False)
class Function:
    node: dict
    env: Env
    module: str
    defaults: dict
    properties: JSObject = field(default_factory=JSObject)


@dataclass
class Builtin:
    name: str
    receiver: object = None


class Runtime:
    def __init__(self, program, kernel=None):
        if program.get("format") != "rea-hcl-program/1":
            raise ValueError("Unsupported HCL program format")
        self.program = program
        self.k = kernel or Kernel()
        self.modules = {m["path"]: m for m in program["modules"]}
        self.project = Project(program["modules"], program.get("project", {}).get("manifests", {}))
        if len(self.modules) != len(program["modules"]):
            raise ValueError("Duplicate module identity")
        self.loaded = {}
        self.wasm_instances = {}
        self.failures = {}
        self.module = None
        self.location = None
        self.executed = set()
        self.strict = False
        self.global_object = JSObject()
        self.object_prototype = JSObject({name: Property(value=Builtin("Object." + name), writable=True, configurable=True)
                                         for name in ("hasOwnProperty", "toString")})
        self.array_prototype = JSObject({name: Property(value=Builtin("Array." + name), writable=True, configurable=True)
                                        for name in ("slice", "shift", "push", "pop", "join", "concat", "indexOf", "sort")}, self.object_prototype)

    @property
    def language(self):
        return self.modules[self.module]["language"]

    def math_boundary(self):
        math = {name: Builtin("math." + name) for name in
                ("abs", "min", "max", "pow", "sqrt", "exp", "log", "ln", "sin", "cos", "floor", "ceil", "trunc")}
        math.update(pi=Number(engine.PI_INT), PI=Number(engine.PI_INT))
        return math

    def builtins(self, language):
        boundary = Env()
        python_names = (
            "len", "range", "enumerate", "zip", "sum", "min", "max", "abs", "pow", "int",
            "list", "tuple", "bool", "str", "TypeError", "ValueError")
        javascript_names = ("Array", "Uint8Array", "Uint16Array", "Int16Array", "Int8Array", "Int32Array", "Uint32Array", "Object", "String", "Number", "Error", "TypeError", "require")
        boundary.values.update({name: Builtin(name) for name in (python_names if language == "python" else javascript_names)})
        env = Env(boundary, function=True)
        if language == "javascript":
            boundary.values.update(Math=self.math_boundary(), undefined=UNDEFINED, globalThis=self.global_object)
            env.values.update(exports=JSObject(prototype=self.object_prototype))
            env.values["<this>"] = env.values["exports"]
            env.values["module"] = {"exports": env.values["exports"]}
        else:
            env.values["__name__"] = "<hcl-module>"
        return env

    def load(self, path):
        if path in self.failures:
            raise Unsupported(self.failures[path])
        if path in self.loaded:
            return self.loaded[path]
        if path not in self.modules:
            raise Unsupported("Module was not supplied: " + path)
        env = self.builtins(self.modules[path]["language"])
        self.loaded[path] = env
        previous, previous_strict = self.module, self.strict
        self.module = path
        self.strict = self.modules[path].get("strict", False)
        if self.modules[path].get("source_type") == "module":
            env.values["<this>"] = UNDEFINED
        try:
            body = self.modules[path]["body"]
            if self.language == "javascript":
                self.hoist(body, env)
            self.block(body, env)
        except Exception as error:
            self.failures[path] = str(error)
            raise
        finally:
            self.module, self.strict = previous, previous_strict
        return env

    def resolve_module(self, specifier):
        if specifier == "hcl:wasm":
            return {name: Builtin("wasm." + name) for name in ("instantiate", "read", "write")}
        if specifier == "math" and self.language == "python":
            return self.math_boundary()
        path = self.project.resolve(self.module, specifier)["target"]
        if self.modules[path]["language"] == "wasm":
            return self.wasm_module(path)
        env = self.load(path)
        language = self.modules[path]["language"]
        return env.values if language == "python" else env.get("default") if language == "json" else env.get("module")["exports"]

    def hoist(self, body, env):
        for node in body:
            kind = node["kind"]
            if kind == "function" and node.get("declaration", True):
                env.values[node["name"]] = self.function(node, env, {})
            elif kind == "declarations" and node["mode"] == "var":
                for entry in node["entries"]:
                    target = entry["target"]
                    for name in self.binding_names(target):
                        env.values.setdefault(name, UNDEFINED)
            elif kind in ("block", "while", "for", "foreach"):
                if kind == "for" and node["init"]:
                    self.hoist([node["init"]], env)
                self.hoist(node["body"], env)
            elif kind == "if":
                self.hoist(node["yes"] + node["no"], env)
            elif kind == "label":
                self.hoist([node["body"]], env)
            elif kind == "try":
                self.hoist([item for item in (node["body"], node["handler"], node["finalizer"]) if item], env)

    def function(self, node, env, defaults):
        value = Function(node, env, self.module, defaults)
        if not node.get("arrow") and not node.get("method"):
            prototype = JSObject({"constructor": Property(value=value, writable=True, configurable=True)}, self.object_prototype)
            value.properties.properties["prototype"] = Property(value=prototype, writable=True)
        return value

    def block(self, body, env):
        if self.language == "javascript":
            for node in body:
                declaration = node.get("declaration") if node["kind"] == "export_names" else node
                if isinstance(declaration, dict) and declaration["kind"] == "declarations" and declaration["mode"] != "var":
                    for entry in declaration["entries"]:
                        for name in self.binding_names(entry["target"]):
                            env.values[name] = UNINITIALIZED
                elif isinstance(declaration, dict) and declaration["kind"] == "class" and declaration.get("declaration"):
                    env.values[declaration["name"]] = UNINITIALIZED
        value = None
        for node in body:
            value = self.eval(node, env)
        return value

    def reference(self, node, env):
        kind = node["kind"]
        if kind == "name":
            name = node["name"]
            def get():
                return env.get(name)
            def put(value):
                if self.language == "python":
                    env.values[name] = value
                else:
                    owner = env.owner(name)
                    if owner.values[name] is UNINITIALIZED:
                        raise SourceError("Binding assigned before initialization: " + name)
                    if name in owner.constants:
                        raise SourceError("Assignment to constant binding: " + name)
                    owner.values[name] = value
            return get, put
        if kind in ("index", "member"):
            obj = self.eval(node["object"], env)
            key = self.eval(node["index"], env) if kind == "index" else node["property"]
            return lambda: self.read_member(obj, key), lambda value: self.write_member(obj, key, value)
        raise Unsupported("Unsupported assignment target: " + kind)

    @staticmethod
    def binding_names(target):
        kind = target["kind"]
        if kind == "name":
            return [target["name"]]
        if kind == "array":
            return [name for item in target["items"] for name in Runtime.binding_names(item)]
        if kind == "object_pattern":
            return [name for _, item in target["pairs"] for name in Runtime.binding_names(item)]
        if kind == "default_pattern":
            return Runtime.binding_names(target["target"])
        raise Unsupported("Unsupported binding pattern: " + kind)

    def assign(self, target, value, env, declaration=False):
        kind = target["kind"]
        if kind == "array":
            if self.language == "python" and len(target["items"]) != len(value):
                raise ValueError("Destructuring length mismatch")
            values = iter(self.utf16(value) if isinstance(value, str) and self.language == "javascript" else value)
            for child in target["items"]:
                self.assign(child, next(values, UNDEFINED), env, declaration)
        elif kind == "object_pattern":
            if value is None or value is UNDEFINED:
                raise SourceError("Cannot destructure null or undefined")
            for key, child in target["pairs"]:
                self.assign(child, self.read_member(value, self.eval(key, env)), env, declaration)
        elif kind == "default_pattern":
            self.assign(target["target"], self.eval(target["value"], env) if value is UNDEFINED else value, env, declaration)
        elif kind == "name" and declaration:
            env.values[target["name"]] = value
        else:
            self.reference(target, env)[1](value)

    @staticmethod
    def utf16(value):
        raw = value.encode("utf-16-le", errors="surrogatepass")
        return [raw[i:i+2].decode("utf-16-le", errors="surrogatepass") for i in range(0, len(raw), 2)]

    def read_member(self, obj, key):
        if self.language == "javascript":
            if obj is None or obj is UNDEFINED:
                raise SourceError("Cannot access property of null or undefined")
            key = self.property_key(key)
            if isinstance(obj, JSClass):
                return obj.prototype if key == "prototype" else self.read_member(obj.static, key)
            if isinstance(obj, (Function, Builtin)):
                if key in ("call", "apply"):
                    return Builtin("Function." + key, obj)
                if isinstance(obj, Builtin):
                    if obj.name == "Array" and key == "prototype":
                        return self.array_prototype
                    if obj.name == "Array" and key == "isArray":
                        return Builtin("Array.isArray")
                    if obj.name == "Object":
                        if key == "prototype":
                            return self.object_prototype
                        if key in ("defineProperty", "getOwnPropertyDescriptor", "getOwnPropertyNames", "keys"):
                            return Builtin("Object." + key)
                    if obj.name == "String" and key == "fromCharCode":
                        return Builtin("String.fromCharCode")
                else:
                    if key == "length":
                        return self.k.number(len(obj.node["params"]))
                    if key == "name":
                        return obj.node["name"]
                    return self.read_member(obj.properties, key)
                raise Unsupported("Unmapped callable property: " + key)
            if isinstance(obj, JSObject):
                prop = self.lookup_property(obj, key)
                if prop is None:
                    return UNDEFINED
                if prop.accessor:
                    return UNDEFINED if prop.getter is None else self.invoke(prop.getter, [], receiver=obj)
                return prop.value.read() if isinstance(prop.value, LiveBinding) else prop.value
            if isinstance(obj, JSArray) and key in obj.properties.properties:
                return self.read_member(obj.properties, key)
            if isinstance(obj, (list, str)) and isinstance(key, str) and key.isascii() and key.isdigit() and str(int(key)) == key:
                key = self.k.number(int(key))
        if isinstance(obj, dict):
            if isinstance(key, Number):
                key = self.k.integer(key)
                if self.language == "javascript":
                    key = str(key)
            if key in obj:
                return obj[key]
            if self.language == "javascript":
                return UNDEFINED
            raise KeyError(key)
        if isinstance(obj, (str, list, tuple)):
            if key == "length" and self.language == "javascript":
                sequence = self.utf16(obj) if isinstance(obj, str) and self.language == "javascript" else obj
                return self.k.number(len(sequence))
            if isinstance(key, Number):
                index = self.k.integer(key)
                sequence = self.utf16(obj) if isinstance(obj, str) and self.language == "javascript" else obj
                if self.language == "javascript" and not 0 <= index < len(sequence):
                    return UNDEFINED
                return sequence[index]
            if isinstance(key, slice):
                return obj[key]
            if self.language == "python":
                if isinstance(obj, str) and key in ("join", "split"):
                    return Builtin("python." + key, obj)
                if isinstance(obj, list) and key in ("append", "pop"):
                    return Builtin("member." + key, obj)
            elif key in ("push", "pop", "shift", "join", "slice", "indexOf", "charCodeAt", "concat", "split", "sort") or isinstance(obj, TypedArray) and key in ("subarray", "set"):
                return Builtin("member." + key, obj)
            elif self.language == "javascript":
                return UNDEFINED
        raise Unsupported("Unmapped member access: " + str(key))

    def write_member(self, obj, key, value):
        if self.language == "javascript":
            key = self.property_key(key)
            if isinstance(obj, JSClass):
                obj = obj.static
            if isinstance(obj, Function):
                obj = obj.properties
            if isinstance(obj, JSObject):
                prop = self.lookup_property(obj, key)
                if prop is not None and prop.accessor:
                    if prop.setter is not None:
                        self.invoke(prop.setter, [value], receiver=obj)
                    elif self.strict:
                        raise SourceError("Assignment to getter-only property: " + key)
                    return
                if prop is not None and not prop.writable:
                    if self.strict:
                        raise SourceError("Assignment to read-only property: " + key)
                    return
                obj.properties[key] = Property(value=value, writable=True, enumerable=True, configurable=True) if key not in obj.properties else prop
                obj.properties[key].value = value
                return
            if isinstance(obj, (list, str)) and isinstance(key, str) and key.isascii() and key.isdigit() and str(int(key)) == key:
                key = self.k.number(int(key))
            elif isinstance(obj, JSArray) and isinstance(key, str):
                if key == "length":
                    length = self.k.integer(value)
                    if not 0 <= length < 2**32:
                        raise SourceError("Invalid array length")
                    del obj[length:]
                    obj.extend([UNDEFINED] * (length - len(obj)))
                    return
                self.write_member(obj.properties, key, value)
                return
        if isinstance(obj, dict):
            if isinstance(key, Number):
                key = self.k.integer(key)
                if self.language == "javascript":
                    key = str(key)
            obj[key] = value
        elif isinstance(obj, list) and isinstance(key, Number):
            index = self.k.integer(key)
            if isinstance(obj, TypedArray):
                if not 0 <= index < len(obj):
                    return
                value = self.typed_value(value, obj.width, obj.signed)
            if self.language == "javascript":
                if index < 0:
                    raise Unsupported("Negative JavaScript array property")
                while len(obj) <= index:
                    obj.append(UNDEFINED)
            obj[index] = value
        else:
            raise Unsupported("Unmapped member assignment")

    def property_key(self, key):
        if isinstance(key, Number):
            return self.string(key)
        if isinstance(key, (str, bool)) or key is None or key is UNDEFINED:
            return self.string(key)
        raise Unsupported("Object-valued property key coercion")

    @staticmethod
    def lookup_property(obj, key):
        while obj is not None:
            if key in obj.properties:
                return obj.properties[key]
            obj = obj.prototype
        return None

    def has_property(self, obj, key):
        if isinstance(obj, JSObject):
            return self.lookup_property(obj, key) is not None
        if isinstance(obj, dict):
            return key in obj
        if isinstance(obj, (list, str)):
            if key == "length":
                return True
            if key.isascii() and key.isdigit() and str(int(key)) == key:
                return 0 <= int(key) < len(self.utf16(obj) if isinstance(obj, str) else obj)
            return isinstance(obj, JSArray) and self.has_property(obj.properties, key)
        raise Unsupported("Property membership requires a supported object")

    def property_names(self, obj, *, enumerable=False, inherited=False):
        if obj is None or obj is UNDEFINED:
            if inherited:
                return []
            raise SourceError("Cannot enumerate null or undefined")
        if isinstance(obj, JSClass):
            obj = obj.static
        if isinstance(obj, dict):
            names = list(obj)
        elif isinstance(obj, (list, str)):
            names = [str(i) for i in range(len(self.utf16(obj) if isinstance(obj, str) else obj))]
            if not enumerable and not isinstance(obj, TypedArray):
                names.append("length")
            if isinstance(obj, JSArray):
                names += self.property_names(obj.properties, enumerable=enumerable)
        elif isinstance(obj, JSObject):
            names, seen = [], set()
            while obj is not None:
                for key, prop in obj.properties.items():
                    if key not in seen and (not enumerable or prop.enumerable):
                        names.append(key)
                    seen.add(key)
                obj = obj.prototype if inherited else None
        else:
            raise Unsupported("Property enumeration for this value")
        # ECMAScript index ordering is a representation rule, not source math.
        indices = [k for k in names if k.isascii() and k.isdigit() and str(int(k)) == k and int(k) < 2**32 - 1]
        return sorted(indices, key=int) + [k for k in names if k not in set(indices)]

    @staticmethod
    def join_utf16(units):
        return "".join(units).encode("utf-16-le", errors="surrogatepass").decode("utf-16-le", errors="surrogatepass")

    def javascript_input(self, value):
        if isinstance(value, (JSArray, JSObject)):
            return value
        if isinstance(value, list):
            return JSArray(self.javascript_input(item) for item in value)
        if isinstance(value, dict):
            return JSObject({key: Property(value=self.javascript_input(item), writable=True, enumerable=True,
                                          configurable=True) for key, item in value.items()}, self.object_prototype)
        return value

    def output(self, value, active=None):
        """Lossless JSON projection, including arrays' named properties.

        No getter, prototype, or named array property is silently mistaken for a
        plain Python container. Cycles/callables remain explicit unsupported.
        """
        active = set() if active is None else active
        if value is UNDEFINED:
            return {"type": "undefined"}
        if isinstance(value, (JSObject, dict, list, tuple)):
            if id(value) in active:
                raise Unsupported("Cyclic result requires a graph-valued output adapter")
            active.add(id(value))
            try:
                if isinstance(value, JSObject):
                    result = {}
                    for key in self.property_names(value, enumerable=True):
                        prop = value.properties[key]
                        if prop.accessor:
                            raise Unsupported("Accessor-valued output requires explicit source reads")
                        result[key] = self.output(prop.value.read() if isinstance(prop.value, LiveBinding) else prop.value, active)
                    return result
                if isinstance(value, (list, tuple)):
                    items = [self.output(item, active) for item in value]
                    if isinstance(value, JSArray) and value.properties.properties:
                        return {"type": "array", "items": items, "properties": self.output(value.properties, active)}
                    return items
                if all(isinstance(key, str) for key in value):
                    return {key: self.output(item, active) for key, item in value.items()}
                return {"type": "map", "entries": [[self.output(k, active), self.output(v, active)] for k, v in value.items()]}
            finally:
                active.remove(id(value))
        return output_value(value)

    def object_builtin(self, name, args, receiver):
        if name == "Object.toString":
            tag = "Undefined" if receiver is UNDEFINED else "Null" if receiver is None else \
                ("Int" if receiver.signed else "Uint") + str(receiver.width) + "Array" if isinstance(receiver, TypedArray) else \
                "Array" if isinstance(receiver, list) else "Function" if isinstance(receiver, (Function, Builtin, JSClass)) else \
                "String" if isinstance(receiver, str) else "Boolean" if isinstance(receiver, bool) else "Number" if isinstance(receiver, Number) else "Object"
            return "[object " + tag + "]"
        if name == "Object":
            if not args or args[0] is None or args[0] is UNDEFINED:
                return JSObject(prototype=self.object_prototype)
            if isinstance(args[0], (JSObject, list, dict)):
                return args[0]
            raise Unsupported("Object primitive boxing")
        if name == "Object.hasOwnProperty":
            return self.property_key(args[0]) in self.property_names(receiver)
        obj = args[0]
        if name in ("Object.keys", "Object.getOwnPropertyNames"):
            return JSArray(self.property_names(obj, enumerable=name == "Object.keys"))
        key = self.property_key(args[1])
        if isinstance(obj, JSClass):
            obj = obj.static
        if not isinstance(obj, JSObject):
            raise Unsupported("Property descriptors currently require an ordinary object")
        old = obj.properties.get(key)
        if name == "Object.getOwnPropertyDescriptor":
            if old is None:
                return UNDEFINED
            result = {"enumerable": old.enumerable, "configurable": old.configurable}
            if old.accessor:
                result.update(get=old.getter or UNDEFINED, set=old.setter or UNDEFINED)
            else:
                result.update(value=old.value, writable=old.writable)
            return self.javascript_input(result)
        desc = args[2]
        fields = {k: self.read_member(desc, k) for k in ("value", "get", "set", "writable", "enumerable", "configurable") if self.has_property(desc, k)}
        accessor = "get" in fields or "set" in fields
        data = "value" in fields or "writable" in fields
        if accessor and data:
            raise SourceError("Descriptor mixes data and accessor fields")
        for key2 in ("get", "set"):
            if key2 in fields and fields[key2] is not UNDEFINED and not isinstance(fields[key2], (Function, Builtin)):
                raise SourceError("Accessor is not callable")
        if old is not None and not old.configurable:
            if self.k.truth(fields.get("configurable", False), "javascript") or ("enumerable" in fields and self.k.truth(fields["enumerable"], "javascript") != old.enumerable):
                raise SourceError("Cannot redefine non-configurable property")
            if accessor and not old.accessor or data and old.accessor:
                raise SourceError("Cannot change non-configurable descriptor kind")
            if old.accessor:
                for key2, previous in (("get", old.getter), ("set", old.setter)):
                    if key2 in fields and fields[key2] is not (previous or UNDEFINED):
                        raise SourceError("Cannot change non-configurable accessor")
            elif not old.writable:
                if self.k.truth(fields.get("writable", False), "javascript") or ("value" in fields and not self.k.binary("===", old.value, fields["value"], "javascript", self.location)):
                    raise SourceError("Cannot change non-writable property")
        from dataclasses import replace
        prop = replace(old) if old is not None else Property(value=UNDEFINED)
        if accessor != prop.accessor and (accessor or data):
            prop.value, prop.writable, prop.getter, prop.setter = UNDEFINED, False, None, None
            prop.accessor = accessor
        for key2 in ("writable", "enumerable", "configurable"):
            if key2 in fields:
                setattr(prop, key2, self.k.truth(fields[key2], "javascript"))
        if "value" in fields:
            prop.value = fields["value"]
        for key2, attribute in (("get", "getter"), ("set", "setter")):
            if key2 in fields:
                setattr(prop, attribute, None if fields[key2] is UNDEFINED else fields[key2])
        obj.properties[key] = prop
        return obj

    def eval(self, node, env):
        previous = self.location
        self.location = node["id"]
        self.executed.add(node["id"])
        try:
            return self.evaluate(node, env)
        except (Unsupported, SourceError, ValueError, KeyError, IndexError, TypeError, ArithmeticError) as error:
            if not hasattr(error, "hcl_location"):
                error.hcl_location = node["id"]
            raise
        finally:
            self.location = previous

    def evaluate(self, n, env):
        kind = n["kind"]
        ev = lambda node: self.eval(node, env)
        if kind == "literal":
            return self.k.number(n["value"]) if n.get("numeric") else n["value"]
        if kind == "name":
            return env.get(n["name"])
        if kind == "this":
            return env.get("<this>")
        if kind == "array":
            value = [ev(item) for item in n["items"]]
            return tuple(value) if n.get("tuple") else JSArray(value) if self.language == "javascript" else value
        if kind == "object":
            if self.language == "javascript":
                value = JSObject(prototype=self.object_prototype)
                for key, item in n["pairs"]:
                    key = self.property_key(ev(key))
                    if key == "__proto__":
                        raise Unsupported("Object literal prototype initializer")
                    value.properties[key] = Property(value=ev(item), writable=True, enumerable=True, configurable=True)
                return value
            return {ev(k): ev(v) for k, v in n["pairs"]}
        if kind == "binary":
            if self.language == "javascript" and n["operator"] == "in":
                key, obj = ev(n["left"]), ev(n["right"])
                return self.has_property(obj, self.property_key(key))
            return self.binary(n["operator"], ev(n["left"]), ev(n["right"]))
        if kind == "unary":
            if n["operator"] == "typeof":
                try:
                    value = ev(n["value"])
                except Unsupported:
                    if n["value"]["kind"] != "name":
                        raise
                    value = UNDEFINED
                return "undefined" if value is UNDEFINED else "number" if isinstance(value, Number) else \
                    "boolean" if isinstance(value, bool) else "string" if isinstance(value, str) else \
                    "function" if isinstance(value, (Function, Builtin, JSClass)) else "object"
            value = ev(n["value"])
            if n["operator"] == "void":
                return UNDEFINED
            if self.language == "javascript" and n["operator"] in ("~", "+", "-"):
                value = self.to_number(value, word=n["operator"] == "~")
            return self.k.unary(n["operator"], value, self.language, n["id"])
        if kind == "logical":
            value = None
            for child in n["values"]:
                value = ev(child)
                truth = self.k.truth(value, self.language)
                if n["operator"] in ("and", "&&") and not truth:
                    break
                if n["operator"] in ("or", "||") and truth:
                    break
                if n["operator"] == "??" and value is not None and value is not UNDEFINED:
                    break
            return value
        if kind == "compare":
            left = ev(n["values"][0])
            for op, child in zip(n["operators"], n["values"][1:]):
                right = ev(child)
                if op in ("is", "is not"):
                    result = left is right
                    if op == "is not":
                        result = not result
                elif op in ("in", "not in"):
                    result = any(self.k.binary("==", left, item, self.language, n["id"]) for item in right)
                    if op == "not in":
                        result = not result
                else:
                    result = self.k.binary(op, left, right, self.language, n["id"])
                if not result:
                    return False
                left = right
            return True
        if kind == "select":
            return ev(n["yes"] if self.k.truth(ev(n["test"]), self.language) else n["no"])
        if kind == "member":
            return self.read_member(ev(n["object"]), n["property"])
        if kind == "index":
            return self.read_member(ev(n["object"]), ev(n["index"]))
        if kind == "slice":
            values = [ev(n[key]) for key in ("lower", "upper", "step")]
            return slice(*[None if v is None else self.k.integer(v) for v in values])
        if kind == "class":
            class_env = Env(env)
            value = JSClass(n["name"], JSObject(prototype=self.object_prototype), JSObject())
            if not n["name"].startswith("<"):
                class_env.values[n["name"]] = value
                class_env.constants.add(n["name"])
            value.prototype.properties["constructor"] = Property(value=value, writable=True, configurable=True)
            for method in n["methods"]:
                key = self.property_key(ev(method["key"]))
                function = self.eval(method["function"], class_env)
                if method["constructor"]:
                    value.constructor = function
                else:
                    obj = value.static if method["static"] else value.prototype
                    obj.properties[key] = Property(value=function, writable=True, configurable=True)
            for field in n.get("fields", []):
                key = self.property_key(ev(field["key"]))
                initializer = self.eval(field["function"], class_env)
                if field["static"]:
                    field_value = self.invoke(initializer, [], receiver=value)
                    value.static.properties[key] = Property(value=field_value, writable=True, enumerable=True, configurable=True)
                else:
                    value.fields.append((key, initializer))
            if n.get("declaration"):
                env.values[n["name"]] = value
            return value
        if kind == "call":
            receiver = UNDEFINED
            target = n["callee"]
            if target["kind"] in ("member", "index"):
                receiver = ev(target["object"])
                key = target["property"] if target["kind"] == "member" else ev(target["index"])
                callee = self.read_member(receiver, key)
            else:
                callee = ev(target)
            args = [ev(arg) for arg in n["arguments"]]
            kwargs = {key: ev(value) for key, value in n["keywords"].items()}
            return self.invoke(callee, args, kwargs, receiver=receiver, construct=n.get("construct", False))
        if kind == "function":
            if self.language == "javascript" and n.get("declaration", True):
                existing = env.values.get(n["name"])
                if isinstance(existing, Function) and existing.node is n:
                    return existing
            defaults = {} if self.language == "javascript" else {name: ev(value) for name, value in n["defaults"].items()}
            value = self.function(n, env, defaults)
            if n.get("declaration", True) and not n["name"].startswith("<"):
                env.values[n["name"]] = value
            return value
        if kind == "assign":
            # JavaScript evaluates the LHS reference before the RHS.
            if self.language == "javascript" and len(n["targets"]) == 1 and n["targets"][0]["kind"] not in ("array", "object_pattern", "default_pattern"):
                _, put = self.reference(n["targets"][0], env)
                value = ev(n["value"])
                put(value)
            else:
                value = ev(n["value"])
                for target in n["targets"]:
                    self.assign(target, value, env)
            return value
        if kind == "update":
            get, put = self.reference(n["target"], env)
            before = get()
            after = self.binary(n["operator"], before, ev(n["value"]))
            put(after)
            return after if n["prefix"] else before
        if kind == "declarations":
            target_env = env.var_owner() if n["mode"] == "var" else env
            for entry in n["entries"]:
                target = entry["target"]
                if entry["value"] is not None:
                    self.assign(target, ev(entry["value"]), target_env, declaration=True)
                elif n["mode"] != "var":
                    self.assign(target, UNDEFINED, target_env, declaration=True)
                else:
                    for name in self.binding_names(target):
                        target_env.values.setdefault(name, UNDEFINED)
                if n["mode"] == "const":
                    target_env.constants.update(self.binding_names(target))
            return None
        if kind == "expression":
            return ev(n["value"])
        if kind == "sequence":
            value = None
            for child in n["values"]:
                value = ev(child)
            return value
        if kind == "block":
            return self.block(n["body"], Env(env) if self.language == "javascript" else env)
        if kind == "return":
            raise Return(ev(n["value"]))
        if kind == "if":
            return self.block(n["yes"] if self.k.truth(ev(n["test"]), self.language) else n["no"], env)
        if kind in ("while", "for", "foreach"):
            return self.loop(n, env)
        if kind == "switch":
            value, start, default = ev(n["value"]), None, None
            for index, case in enumerate(n["cases"]):
                if case["test"] is None:
                    default = index
                elif self.k.binary("===", value, ev(case["test"]), self.language, n["id"]):
                    start = index
                    break
            start = default if start is None else start
            if start is not None:
                try:
                    for case in n["cases"][start:]:
                        self.block(case["body"], env)
                except Break as jump:
                    if jump.label is not None:
                        raise
            return None
        if kind == "break":
            raise Break(n.get("label"))
        if kind == "continue":
            raise Continue(n.get("label"))
        if kind == "label":
            try:
                return ev(n["body"])
            except Break as jump:
                if jump.label not in n["labels"]:
                    raise
            return None
        if kind == "try":
            pending, value = None, None
            try:
                try:
                    value = ev(n["body"])
                except SourceError as error:
                    if n["handler"] is None:
                        raise
                    catch = Env(env)
                    if n["binding"] is not None:
                        self.assign(n["binding"], error.value, catch, declaration=True)
                    value = self.eval(n["handler"], catch)
            except (Return, Break, Continue, SourceError) as completion:
                pending = completion
            # Unsupported adapters/internal failures cannot become successful
            # target results by a source catch/finally return.
            if n["finalizer"] is not None:
                ev(n["finalizer"])
            if pending is not None:
                raise pending
            return value
        if kind == "pass":
            return None
        if kind == "throw":
            raise SourceError(ev(n["value"]))
        if kind == "assert":
            if not self.k.truth(ev(n["test"]), self.language):
                raise SourceError(str(ev(n["message"])))
            return None
        if kind == "import":
            for item in n["entries"]:
                module = self.resolve_module(item["module"])
                if self.language == "javascript" and item["name"] is not None:
                    env.values[item["alias"]] = LiveBinding(lambda module=module, name=item["name"]: self.read_member(module, name))
                    env.constants.add(item["alias"])
                else:
                    env.values[item["alias"]] = module if item["name"] is None else self.read_member(module, item["name"])
            return None
        if kind == "reexport":
            module = self.resolve_module(n["module"])
            for item in n["names"]:
                env.get("module")["exports"].properties[item["exported"]] = Property(
                    value=LiveBinding(lambda module=module, name=item["local"]: self.read_member(module, name)), enumerable=True)
            return None
        if kind == "export":
            self.write_member(env.get("module")["exports"], n["name"], ev(n["value"]))
            return None
        if kind == "export_names":
            if n["declaration"]:
                declaration = n["declaration"]
                ev(declaration)
                names = [declaration["name"]] if declaration["kind"] in ("function", "class") else \
                    [name for entry in declaration.get("entries", []) for name in self.binding_names(entry["target"])]
                for name in names:
                    env.get("module")["exports"].properties[name] = Property(value=LiveBinding(lambda name=name: env.get(name)), enumerable=True)
            for item in n["names"]:
                env.get("module")["exports"].properties[item["exported"]] = Property(value=LiveBinding(lambda name=item["local"]: env.get(name)), enumerable=True)
            return None
        if kind == "data":
            value = ev(n["value"])
            env.values["default"] = value
            return value
        if kind == "unknown":
            raise Unsupported("Unlowered source syntax: " + n["syntax"])
        raise Unsupported("Unknown graph node: " + kind)

    def loop(self, n, env):
        kind = n["kind"]
        lexical = kind == "for" and n.get("init") and n["init"]["kind"] == "declarations" and n["init"]["mode"] != "var"
        if lexical:
            env = Env(env)
        if kind == "for" and n["init"]:
            self.block([n["init"]], env)
        iterable = self.eval(n["iterable"], env) if kind == "foreach" else None
        iterator = iter(self.property_names(iterable, enumerable=True, inherited=True) if n.get("keys") else iterable) if kind == "foreach" else None
        first, broken = True, False
        while True:
            if iterator is not None:
                try:
                    value = next(iterator)
                except StopIteration:
                    break
                target_env = env
                if n.get("mode"):
                    target_env = env.var_owner() if n["mode"] == "var" else Env(env)
                    self.assign(n["target"], value, target_env, declaration=True)
                    if n["mode"] == "const":
                        target_env.constants.update(self.binding_names(n["target"]))
                else:
                    self.assign(n["target"], value, env)
            elif not (first and n.get("post")) and not self.k.truth(self.eval(n["test"], env), self.language):
                break
            first = False
            try:
                self.block(n["body"], target_env if iterator is not None else env)
            except Continue as jump:
                if jump.label is not None and jump.label not in n.get("labels", []):
                    raise
            except Break as jump:
                if jump.label is not None and jump.label not in n.get("labels", []):
                    raise
                broken = True
                break
            if kind == "for" and n["update"]:
                if lexical:
                    iteration = Env(env.parent)
                    iteration.values.update(env.values)
                    iteration.constants.update(env.constants)
                    env = iteration
                self.eval(n["update"], env)
        if not broken:
            self.block(n.get("otherwise", []), env)
        return None

    def invoke(self, callee, args, kwargs=None, *, receiver=UNDEFINED, construct=False):
        kwargs = kwargs or {}
        if isinstance(callee, WasmFunction):
            if kwargs or construct:
                raise TypeError("WebAssembly functions accept positional arguments only")
            return callee.instance.call(callee.index, args)
        if isinstance(callee, JSClass):
            if not construct:
                raise SourceError("Class constructor requires new")
            instance = JSObject(prototype=callee.prototype)
            for key, initializer in callee.fields:
                instance.properties[key] = Property(value=self.invoke(initializer, [], receiver=instance), writable=True, enumerable=True, configurable=True)
            result = self.invoke(callee.constructor, args, kwargs, receiver=instance) if callee.constructor else UNDEFINED
            return result if isinstance(result, (JSObject, list, Function, JSClass)) else instance
        if construct and isinstance(callee, Function):
            if callee.node.get("arrow") or callee.node.get("method"):
                raise SourceError("Function is not a constructor")
            prototype = self.read_member(callee.properties, "prototype")
            instance = JSObject(prototype=prototype if isinstance(prototype, JSObject) else self.object_prototype)
            result = self.invoke(callee, args, kwargs, receiver=instance)
            return result if isinstance(result, (JSObject, list, dict, Function, JSClass)) else instance
        if construct and not (isinstance(callee, Builtin) and callee.name in ("Object", "Array", "Uint8Array", "Uint16Array", "Int8Array", "Int16Array", "Int32Array", "Uint32Array", "Error", "TypeError")):
            raise Unsupported("Constructor requires an ordinary lowered class or declared boundary")
        if isinstance(callee, Builtin):
            if kwargs:
                raise Unsupported("Keyword arguments to boundary function: " + callee.name)
            return self.builtin(callee, args, receiver)
        if not isinstance(callee, Function):
            raise Unsupported("Call target is not a lowered function")
        node = callee.node
        env = Env(callee.env, function=True)
        previous, previous_strict = self.module, self.strict
        self.module = callee.module
        self.strict = node.get("strict", False)
        try:
            if self.language == "javascript" and not node.get("arrow"):
                if not self.strict and (receiver is UNDEFINED or receiver is None):
                    receiver = self.global_object
                elif not self.strict and isinstance(receiver, (str, Number, bool)):
                    raise Unsupported("Sloppy primitive receiver boxing")
                env.values["<this>"] = receiver
            if self.language == "javascript" and not node["name"].startswith("<"):
                env.values[node["name"]] = callee
            for i, name in enumerate(node["params"]):
                if i < len(args):
                    if name in kwargs:
                        raise TypeError("Duplicate argument: " + name)
                    value = args[i]
                elif name in kwargs:
                    value = kwargs[name]
                elif name in node["defaults"] and self.language != "javascript":
                    value = callee.defaults[name]
                elif self.language == "javascript":
                    value = UNDEFINED
                else:
                    raise TypeError("Missing argument: " + name)
                if self.language == "javascript" and value is UNDEFINED and name in node["defaults"]:
                    value = self.eval(node["defaults"][name], env)
                env.values[name] = value
            if set(kwargs) - set(node["params"]):
                raise TypeError("Unknown keyword argument")
            if node["rest"]:
                env.values[node["rest"]] = args[len(node["params"]):]
            elif len(args) > len(node["params"]) and self.language != "javascript":
                raise TypeError("Too many arguments")
            if self.language == "javascript":
                if not node.get("arrow"):
                    env.values["arguments"] = JSArray(args)
                self.hoist(node["body"], env)
            try:
                self.block(node["body"], env)
            except Return as result:
                return result.value
            return UNDEFINED if self.language == "javascript" else None
        finally:
            self.module, self.strict = previous, previous_strict

    @staticmethod
    def string(value):
        if isinstance(value, Number):
            return engine.HCLTranscriber.from_fp(value.value).rstrip("0").rstrip(".")
        if value is UNDEFINED:
            return "undefined"
        if value is None:
            return "null"
        if isinstance(value, bool):
            return "true" if value else "false"
        return str(value)

    def to_number(self, value, *, word=False):
        """Finite primitive conversion at the source value boundary."""
        if isinstance(value, Number):
            return value
        if value is None or isinstance(value, bool):
            return self.k.number(0 if value is None else int(value))
        if isinstance(value, str):
            token = value.strip()
            if not token:
                return self.k.number(0)
            try:
                if token.lower().startswith(("0x", "0o", "0b")):
                    return self.k.number(int(token, 0))
                from decimal import Decimal, InvalidOperation
                parsed = Decimal(token)
                if parsed.is_finite():
                    return self.k.number(token)
            except (InvalidOperation, ValueError):
                pass
            if word:
                return self.k.number(0)
        if value is UNDEFINED and word:
            return self.k.number(0)
        raise Unsupported("Value conversion leaves the finite HCL number domain")

    def binary(self, operator, left, right):
        if self.language == "javascript":
            if operator == "instanceof":
                if not isinstance(right, (Function, JSClass)):
                    raise Unsupported("instanceof requires a lowered constructor")
                prototype = right.prototype if isinstance(right, JSClass) else self.read_member(right.properties, "prototype")
                if not isinstance(prototype, JSObject):
                    raise SourceError("Constructor prototype is not an object")
                current = left.prototype if isinstance(left, JSObject) else None
                while current is not None:
                    if current is prototype:
                        return True
                    current = current.prototype
                return False
            if operator in ("==", "!=") and type(left) is not type(right):
                if left in (None, UNDEFINED) and right in (None, UNDEFINED):
                    return operator == "=="
                if isinstance(left, (Number, str, bool)) and isinstance(right, (Number, str, bool)):
                    left, right = self.to_number(left), self.to_number(right)
            if operator == "+" and (isinstance(left, str) or isinstance(right, str)):
                if not all(isinstance(v, (Number, str, bool)) or v is None or v is UNDEFINED for v in (left, right)):
                    raise Unsupported("Object-to-primitive conversion requires a source adapter")
                left, right = self.string(left), self.string(right)
            elif operator in ("+", "-", "*", "/", "%", "**", "&", "|", "^", "<<", ">>", ">>>"):
                word = operator in ("&", "|", "^", "<<", ">>", ">>>")
                left, right = self.to_number(left, word=word), self.to_number(right, word=word)
        return self.k.binary(operator, left, right, self.language, self.location)

    def builtin(self, callee, args, receiver=UNDEFINED):
        name, obj = callee.name, callee.receiver
        if name == "Number":
            return self.to_number(args[0]) if args else self.k.number(0)
        if name == "Array.isArray":
            return isinstance(args[0], list) and not isinstance(args[0], TypedArray)
        if name.startswith("Array."):
            name, obj = "member." + name.removeprefix("Array."), receiver
        if name.startswith("wasm."):
            if name == "wasm.instantiate":
                if not 1 <= len(args) <= 2 or not isinstance(args[0], WasmModule):
                    raise TypeError("hcl:wasm.instantiate requires a supplied WASM module and optional imports")
                instance = WasmInstance(self, args[0], args[1] if len(args) == 2 else {})
                return self.javascript_input({"exports": instance.exports})
            if len(args) != 3 or not isinstance(args[0], WasmMemory):
                raise TypeError("hcl:wasm read/write requires memory, offset and length/bytes")
            memory, offset, value = args
            offset = self.k.integer(offset)
            if name == "wasm.read":
                return JSArray(self.k.number(byte) for byte in memory.read(offset, self.k.integer(value)))
            # Caller-supplied bytes are a representation boundary, not coercion.
            data = bytes(self.k.integer(byte) for byte in value)
            memory.write(offset, data)
            return UNDEFINED
        if name == "Object" or name.startswith("Object."):
            return self.object_builtin(name, args, receiver)
        if name.startswith("Function."):
            this = args[0] if args else UNDEFINED
            values = args[1:] if name == "Function.call" else ([] if len(args) < 2 or args[1] is None or args[1] is UNDEFINED else list(args[1]))
            return self.invoke(obj, values, receiver=this)
        if name == "String":
            return self.string(args[0]) if args else ""
        if name == "String.fromCharCode":
            return self.join_utf16([chr(self.k.integer(self.typed_value(v, 16, False))) for v in args])
        if name.startswith("math.") or name in ("abs", "min", "max", "pow", "int"):
            return self.k.function(name.removeprefix("math."), args, self.location)
        if name in ("Error", "ValueError", "TypeError"):
            return self.string(args[0]) if args else name
        if name == "require":
            return self.resolve_module(args[0])
        if name == "len":
            return self.k.number(len(args[0]))
        if name == "range":
            if not 1 <= len(args) <= 3:
                raise TypeError("range requires one to three arguments")
            start, stop = (self.k.number(0), args[0]) if len(args) == 1 else args[:2]
            step = args[2] if len(args) == 3 else self.k.number(1)
            self.k.integer(start), self.k.integer(stop), self.k.integer(step)
            if not step.value:
                raise ValueError("Zero range step")
            def values():
                current = start
                while self.k.binary("<" if step.value > 0 else ">", current, stop, source=self.location):
                    yield current
                    current = self.k.binary("+", current, step, source=self.location)
            return values()
        if name == "enumerate":
            def values():
                index = args[1] if len(args) > 1 else self.k.number(0)
                for value in args[0]:
                    yield (index, value)
                    index = self.k.binary("+", index, self.k.number(1), source=self.location)
            return values()
        if name == "zip":
            return zip(*args)
        if name == "sum":
            value = args[1] if len(args) > 1 else self.k.number(0)
            for item in args[0]:
                value = self.k.binary("+", value, item, source=self.location)
            return value
        if name in ("list", "tuple"):
            return (list if name == "list" else tuple)(args[0] if args else [])
        if name == "bool":
            return self.k.truth(args[0], self.language) if args else False
        if name == "str":
            if not args:
                return ""
            if args[0] is None or isinstance(args[0], bool):
                return str(args[0])
            if isinstance(args[0], (Number, str)):
                return self.string(args[0])
            raise Unsupported("Python container repr requires a formatting adapter")
        if name == "python.join":
            return obj.join(args[0])
        if name == "python.split":
            return obj.split(args[0] if args else None, self.k.integer(args[1]) if len(args) > 1 else -1)
        if name in ("Array", "Uint8Array", "Uint16Array", "Int8Array", "Int16Array", "Int32Array", "Uint32Array"):
            width = 8 if "8" in name else 16 if "16" in name else 32
            signed = name.startswith("Int")
            if len(args) == 1 and isinstance(args[0], Number):
                length = self.k.integer(args[0])
                if length < 0:
                    raise ValueError("Negative array length")
                values = [self.k.number(0) if name != "Array" else UNDEFINED for _ in range(length)]
                return JSArray(values) if name == "Array" else TypedArray(values, width, signed)
            if name == "Array":
                return JSArray(args)
            return TypedArray([self.typed_value(v, width, signed) for v in args[0]] if args else [], width, signed)
        if name.startswith("member."):
            method = name.removeprefix("member.")
            if method == "subarray" and isinstance(obj, TypedArray):
                start, end, _ = slice(self.k.integer(args[0]) if args else 0,
                                      self.k.integer(args[1]) if len(args) > 1 else len(obj)).indices(len(obj))
                return obj.view(start, end)
            if method == "set" and isinstance(obj, TypedArray):
                values = list(args[0])
                offset = self.k.integer(args[1]) if len(args) > 1 else 0
                if offset < 0 or offset + len(values) > len(obj):
                    raise SourceError("Typed array set out of bounds")
                for index, value in enumerate(values):
                    obj[offset + index] = self.typed_value(value, obj.width, obj.signed)
                return UNDEFINED
            if method == "sort" and isinstance(obj, list) and not isinstance(obj, TypedArray):
                from functools import cmp_to_key
                def compare(a, b):
                    if args and args[0] is not UNDEFINED:
                        value = self.k.numeric(self.invoke(args[0], [a, b]))
                        return (value > 0) - (value < 0)
                    a, b = self.utf16(self.string(a)), self.utf16(self.string(b))
                    return (a > b) - (a < b)
                obj.sort(key=cmp_to_key(compare))
                return obj
            if method in ("push", "append") and isinstance(obj, list) and not isinstance(obj, TypedArray):
                obj.extend(args)
                return self.k.number(len(obj)) if method == "push" else None
            if method in ("pop", "shift") and isinstance(obj, list) and not isinstance(obj, TypedArray):
                if not obj and self.language == "javascript":
                    return UNDEFINED
                return obj.pop(0 if method == "shift" else self.k.integer(args[0]) if args and self.language == "python" else -1)
            if method == "join":
                separator = args[0] if args else ","
                return separator.join("" if v is None or v is UNDEFINED else self.string(v) for v in obj)
            if method == "slice":
                start = self.k.integer(args[0]) if args else 0
                end = self.k.integer(args[1]) if len(args) > 1 else None
                if isinstance(obj, str):
                    return self.join_utf16(self.utf16(obj)[start:end])
                if isinstance(obj, TypedArray):
                    return TypedArray(obj[start:end], obj.width, obj.signed)
                return JSArray(obj[start:end]) if self.language == "javascript" else obj[start:end]
            if method == "charCodeAt" and isinstance(obj, str):
                units = self.utf16(obj)
                index = self.k.integer(args[0]) if args else 0
                if not 0 <= index < len(units):
                    raise Unsupported("Out-of-range charCodeAt produces NaN outside the finite HCL value domain")
                return self.k.number(ord(units[index]))
            if method == "indexOf":
                start = self.k.integer(args[1]) if len(args) > 1 else 0
                if isinstance(obj, str):
                    units, query = "".join(self.utf16(obj)), "".join(self.utf16(args[0]))
                    return self.k.number(units.find(query, min(len(units), max(0, start))))
                if start < 0:
                    start = max(0, len(obj) + start)
                for index in range(start, len(obj)):
                    if self.k.binary("===", obj[index], args[0], self.language, self.location):
                        return self.k.number(index)
                return self.k.number(-1)
            if method == "concat":
                if isinstance(obj, str):
                    return obj + "".join(self.string(v) for v in args)
                result = JSArray(obj)
                for value in args:
                    result.extend(value if isinstance(value, list) else [value])
                return result
            if method == "split" and isinstance(obj, str):
                return JSArray(self.utf16(obj) if args and args[0] == "" else obj.split(args[0]) if args else [obj])
        raise Unsupported("No boundary adapter for " + name)

    def typed_value(self, value, width, signed):
        if self.k.numeric(value) % engine.SCALE:
            value = self.k.function("trunc", [value], self.location)
        modulus = self.k.number(1 << width)
        value = self.k.binary("%", value, modulus, "python", self.location)
        if signed and self.k.binary(">=", value, self.k.number(1 << (width - 1)), source=self.location):
            value = self.k.binary("-", value, modulus, source=self.location)
        return value

    def wasm_module(self, path):
        body = self.modules[path]["body"]
        if len(body) != 1 or body[0]["kind"] != "wasm_module":
            raise Unsupported("WebAssembly module was not lowered: " + path)
        return WasmModule(body[0])

    def call(self, module, entry, args, kwargs=None, *, construct=False, receiver_id=None, bindings=None):
        if receiver_id is not None:
            if receiver_id not in bindings:
                raise ValueError("Unknown previous result: " + receiver_id)
            previous, self.module = self.module, module
            try:
                receiver = bindings[receiver_id]
                values = [self.javascript_input(item) for item in args] if self.language == "javascript" else args
                return self.invoke(self.read_member(receiver, entry), values, kwargs, receiver=receiver, construct=construct)
            finally:
                self.module = previous
        if module in self.modules and self.modules[module]["language"] == "wasm":
            previous, self.module = self.module, module
            try:
                if kwargs:
                    raise TypeError("WebAssembly calls accept positional arguments only")
                if module not in self.wasm_instances:
                    self.wasm_instances[module] = WasmInstance(self, self.wasm_module(module), {})
                value = self.wasm_instances[module].exports[entry]
                if isinstance(value, LiveBinding):
                    value = value.read()
                if isinstance(value, WasmFunction):
                    return self.invoke(value, args)
                if args:
                    raise TypeError("Arguments supplied to a WebAssembly data export")
                return value
            finally:
                self.module = previous
        env = self.load(module)
        previous = self.module
        self.module = module
        try:
            exports = env.get("module")["exports"] if self.language == "javascript" else {}
            if entry == "default":
                value = env.get("default") if "default" in env.values else exports
                if isinstance(value, (dict, JSObject)) and self.has_property(value, "default"):
                    value = self.read_member(value, "default")
            elif isinstance(exports, (dict, JSObject)) and self.has_property(exports, entry):
                value = self.read_member(exports, entry)
            else:
                value = env.get(entry)
            if not isinstance(value, (Function, Builtin, JSClass)) and (args or kwargs):
                raise TypeError("Arguments supplied to a data value")
            if self.language == "javascript":
                args = [self.javascript_input(item) for item in args]
            return self.invoke(value, args, kwargs, construct=construct) if isinstance(value, (Function, Builtin, JSClass)) else value
        finally:
            self.module = previous
