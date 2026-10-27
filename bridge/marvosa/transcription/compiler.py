"""One lowering/analysis walk: source syntax becomes an HCL operation graph.

Both frontends emit through this owner. Constant expressions are analyzed using
the SAME Kernel the graph executes on. No source eval, external model, or MST.
Unlowered syntax stays attached to its complete source and an explicit unknown.
"""
import ast
import json
from decimal import Decimal

from .kernel import Kernel, PRIMITIVES, Unsupported, output_value


class Compiler:
    def __init__(self, sources):
        self.sources = sources
        self.kernel = Kernel()
        self.locations = {}
        self.operations = []
        self.functions = []
        self.calls = []
        self.unknowns = []
        self.constants = {}
        self.current = None
        self.scope = "<module>"
        self.sequence = 0
        self.manifests = {}

    def node(self, kind, location=None, **fields):
        self.sequence += 1
        identity = self.current["path"] + ":" + str(self.sequence)
        self.locations[identity] = {"path": self.current["path"], **(location or {})}
        node = {"kind": kind, "id": identity, **fields}
        if kind in ("binary", "unary", "update"):
            primitive = PRIMITIVES.get(fields["operator"], "shell control/selection")
            node["primitive"] = primitive
            self.operations.append({"id": identity, "scope": self.scope,
                                    "operator": fields["operator"], "primitive": primitive})
        if kind == "compare":
            for operator in fields["operators"]:
                self.operations.append({"id": identity, "scope": self.scope,
                                        "operator": operator, "primitive": PRIMITIVES.get(operator, "shell identity/membership")})
        if kind == "call":
            target = self.display(fields["callee"])
            self.calls.append({"id": identity, "scope": self.scope, "target": target})
            method = target.removeprefix("Math.").removeprefix("math.")
            if method in PRIMITIVES:
                node["primitive"] = PRIMITIVES[method]
                self.operations.append({"id": identity, "scope": self.scope,
                                        "operator": target, "primitive": PRIMITIVES[method]})
        try:
            value = self.fold(node)
            if value is not _UNKNOWN:
                self.constants[identity] = value
                if kind != "literal":
                    node["analysis_value"] = output_value(value)
        except (ValueError, ArithmeticError) as error:
            # A statically invalid expression may be on a branch that never runs.
            # Keep it in the program; never substitute a fabricated value.
            node["analysis_error"] = str(error)
        return node

    def fold(self, node):
        kind = node["kind"]
        if kind == "literal":
            return self.kernel.number(node["value"]) if node.get("numeric") else node["value"]
        if kind == "binary":
            left = self.constants.get(node["left"]["id"], _UNKNOWN)
            right = self.constants.get(node["right"]["id"], _UNKNOWN)
            if left is not _UNKNOWN and right is not _UNKNOWN:
                return self.kernel.binary(node["operator"], left, right,
                                          self.current["language"], node["id"])
        if kind == "unary":
            value = self.constants.get(node["value"]["id"], _UNKNOWN)
            if value is not _UNKNOWN:
                return self.kernel.unary(node["operator"], value,
                                         self.current["language"], node["id"])
        # Resolve no dynamic calls during analysis. A symbol named sqrt/Math can
        # be rebound by source code; only literal operator trees are folded.
        return _UNKNOWN

    @staticmethod
    def display(node):
        if node["kind"] == "name":
            return node["name"]
        if node["kind"] == "member":
            return Compiler.display(node["object"]) + "." + node["property"]
        return "<dynamic>"

    def unknown(self, name, location=None, detail=None):
        node = self.node("unknown", location, syntax=name)
        self.unknowns.append({"id": node["id"], "scope": self.scope,
                              "syntax": name, "reason": detail or "No lowering adapter for this syntax"})
        return node

    def function(self, name, params, body_factory, location, defaults=None, rest=None):
        previous = self.scope
        self.scope = name if previous == "<module>" else previous + "." + name
        body = body_factory()
        node = self.node("function", location, name=name, params=params,
                         defaults=defaults or {}, rest=rest, body=body)
        self.functions.append({"id": node["id"], "name": self.scope,
                               "path": self.current["path"], "parameters": params})
        self.scope = previous
        return node

    def compile(self):
        modules = []
        retained = []
        for source in self.sources:
            self.current = source
            self.scope = "<module>"
            content = source["content"]
            retained.append({key: value for key, value in source.items() if key not in ("ast", "parse_error")})
            language = source["language"]
            try:
                if source.get("parse_error"):
                    body = [self.unknown("parse", detail=source["parse_error"])]
                elif language == "python":
                    body = PythonFrontend(self).statements(ast.parse(content, filename=source["path"]).body)
                elif language == "javascript":
                    from .javascript import JavaScriptFrontend
                    frontend = JavaScriptFrontend(self)
                    syntax = source["ast"]["program"]
                    frontend.strict = syntax.get("sourceType") == "module" or any(
                        d.get("value", {}).get("value") == "use strict" for d in syntax.get("directives", []))
                    body = frontend.statements(syntax["body"])
                elif language == "json":
                    value = json.loads(content, parse_float=Decimal)
                    body = [self.node("data", value=self.data(value))]
                    if source["path"].split("/")[-1] == "package.json" and isinstance(value, dict):
                        self.manifests[source["path"]] = {key: value[key] for key in ("name", "main", "exports", "type")
                                                        if key in value and isinstance(value[key], (str, dict, list, type(None)))}
                elif language == "wasm":
                    from .wasm import WasmFrontend
                    body = [WasmFrontend(self).lower()]
                else:
                    body = [self.unknown(language, detail="Content retained in full; a semantic frontend is required")]
            except (SyntaxError, json.JSONDecodeError) as error:
                body = [self.unknown("parse", detail=str(error))]
            except (Unsupported, ValueError) as error:
                if language != "wasm":
                    raise
                body = [self.unknown("wasm", detail=str(error))]
            module = {"path": source["path"], "language": language, "body": body}
            if language == "javascript" and source.get("ast"):
                syntax = source["ast"]["program"]
                module["strict"] = syntax.get("sourceType") == "module" or any(
                    d.get("value", {}).get("value") == "use strict" for d in syntax.get("directives", []))
                module["source_type"] = syntax.get("sourceType", "script")
            modules.append(module)
        operation_ids = {op["id"] for op in self.operations}
        from .project import Project
        return {"format": "rea-hcl-program/1", "sources": retained, "modules": modules,
                "project": Project(modules, self.manifests).inventory(),
                "locations": self.locations, "analysis": {
                    "functions": self.functions, "calls": self.calls,
                    "operations": self.operations, "unknowns": self.unknowns,
                    "constant_results": [{"id": identity, "value": output_value(value)}
                                         for identity, value in self.constants.items()
                                         if identity in operation_ids],
                    "generator_count": self.kernel.t.braid_len,
                    "braid": self.kernel.braid(), "braid_sources": self.kernel.braid_sources(),
                }}

    def data(self, value):
        if isinstance(value, list):
            return self.node("array", items=[self.data(v) for v in value])
        if isinstance(value, dict):
            return self.node("object", pairs=[[self.node("literal", value=k), self.data(v)] for k, v in value.items()])
        if isinstance(value, (int, Decimal)) and not isinstance(value, bool):
            return self.node("literal", value=str(value), numeric=True)
        return self.node("literal", value=value)


_UNKNOWN = object()
PY_OPS = {ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/", ast.FloorDiv: "//",
          ast.Mod: "%", ast.Pow: "**", ast.BitAnd: "&", ast.BitOr: "|", ast.BitXor: "^",
          ast.LShift: "<<", ast.RShift: ">>", ast.Eq: "==", ast.NotEq: "!=", ast.Lt: "<",
          ast.LtE: "<=", ast.Gt: ">", ast.GtE: ">=", ast.Is: "is", ast.IsNot: "is not",
          ast.In: "in", ast.NotIn: "not in", ast.USub: "-", ast.UAdd: "+", ast.Not: "not",
          ast.Invert: "~", ast.And: "and", ast.Or: "or"}


class PythonFrontend:
    def __init__(self, compiler):
        self.c = compiler

    @staticmethod
    def location(node):
        return {"line": getattr(node, "lineno", 1), "column": getattr(node, "col_offset", 0),
                "end_line": getattr(node, "end_lineno", 1), "end_column": getattr(node, "end_col_offset", 0)}

    def statements(self, nodes):
        return [self.lower(node) for node in nodes]

    def lower(self, n):
        loc = self.location(n)
        emit = lambda kind, **fields: self.c.node(kind, loc, **fields)
        lower = self.lower
        if n is None:
            return emit("literal", value=None)
        if isinstance(n, ast.Constant):
            value = n.value
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                # ast.Constant.value may already be a float. Use the original
                # token, never its rounded host representation.
                token = ast.get_source_segment(self.c.current["content"], n).replace("_", "")
                if token.lower().startswith(("0x", "0o", "0b")):
                    token = str(int(token, 0))
                return emit("literal", value=token, numeric=True)
            if isinstance(value, (str, bool)) or value is None:
                return emit("literal", value=value)
        if isinstance(n, ast.Name):
            return emit("name", name=n.id)
        if isinstance(n, (ast.List, ast.Tuple)):
            return emit("array", items=[lower(item) for item in n.elts], tuple=isinstance(n, ast.Tuple))
        if isinstance(n, ast.Dict) and all(key is not None for key in n.keys):
            return emit("object", pairs=[[lower(k), lower(v)] for k, v in zip(n.keys, n.values)])
        if isinstance(n, ast.BinOp) and type(n.op) in PY_OPS:
            return emit("binary", operator=PY_OPS[type(n.op)], left=lower(n.left), right=lower(n.right))
        if isinstance(n, ast.UnaryOp) and type(n.op) in PY_OPS:
            return emit("unary", operator=PY_OPS[type(n.op)], value=lower(n.operand))
        if isinstance(n, ast.BoolOp):
            return emit("logical", operator=PY_OPS[type(n.op)], values=[lower(v) for v in n.values])
        if isinstance(n, ast.Compare):
            return emit("compare", operators=[PY_OPS[type(op)] for op in n.ops],
                        values=[lower(n.left), *[lower(v) for v in n.comparators]])
        if isinstance(n, ast.IfExp):
            return emit("select", test=lower(n.test), yes=lower(n.body), no=lower(n.orelse))
        if isinstance(n, ast.Attribute):
            return emit("member", object=lower(n.value), property=n.attr)
        if isinstance(n, ast.Subscript):
            return emit("index", object=lower(n.value), index=lower(n.slice))
        if isinstance(n, ast.Slice):
            return emit("slice", lower=lower(n.lower), upper=lower(n.upper), step=lower(n.step))
        if isinstance(n, ast.Call):
            if any(keyword.arg is None for keyword in n.keywords):
                return self.c.unknown("keyword expansion", loc)
            return emit("call", callee=lower(n.func), arguments=[lower(v) for v in n.args],
                        keywords={kw.arg: lower(kw.value) for kw in n.keywords})
        if isinstance(n, ast.Assign):
            return emit("assign", targets=[lower(v) for v in n.targets], value=lower(n.value))
        if isinstance(n, ast.AnnAssign):
            return emit("assign", targets=[lower(n.target)], value=lower(n.value))
        if isinstance(n, ast.AugAssign):
            return emit("update", target=lower(n.target), operator=PY_OPS[type(n.op)], value=lower(n.value), prefix=True)
        if isinstance(n, ast.Expr):
            return emit("expression", value=lower(n.value))
        if isinstance(n, ast.FunctionDef):
            if n.decorator_list or n.args.kwarg or n.args.kwonlyargs:
                return self.c.unknown("decorated/keyword-only function", loc)
            args = [arg.arg for arg in n.args.posonlyargs + n.args.args]
            defaults = {name: lower(value) for name, value in zip(args[len(args)-len(n.args.defaults):], n.args.defaults)}
            return self.c.function(n.name, args, lambda: self.statements(n.body), loc,
                                   defaults, n.args.vararg.arg if n.args.vararg else None)
        if isinstance(n, ast.Lambda):
            if n.args.defaults or n.args.vararg or n.args.kwarg or n.args.kwonlyargs:
                return self.c.unknown("lambda argument shape", loc)
            return self.c.function("<lambda>", [a.arg for a in n.args.args],
                                   lambda: [emit("return", value=lower(n.body))], loc)
        if isinstance(n, ast.Return):
            return emit("return", value=lower(n.value))
        if isinstance(n, ast.If):
            return emit("if", test=lower(n.test), yes=self.statements(n.body), no=self.statements(n.orelse))
        if isinstance(n, ast.While):
            return emit("while", test=lower(n.test), body=self.statements(n.body), otherwise=self.statements(n.orelse))
        if isinstance(n, ast.For):
            return emit("foreach", target=lower(n.target), iterable=lower(n.iter), body=self.statements(n.body),
                        otherwise=self.statements(n.orelse))
        if isinstance(n, (ast.Break, ast.Continue, ast.Pass)):
            return emit(type(n).__name__.lower())
        if isinstance(n, ast.Import):
            return emit("import", entries=[{"module": a.name, "name": None, "alias": a.asname or a.name} for a in n.names])
        if isinstance(n, ast.ImportFrom):
            if n.module == "__future__" and all(a.name == "annotations" for a in n.names):
                return emit("pass")
            return emit("import", entries=[{"module": "." * n.level + (n.module or ""), "name": a.name,
                                            "alias": a.asname or a.name} for a in n.names])
        if isinstance(n, ast.Raise):
            return emit("throw", value=lower(n.exc))
        if isinstance(n, ast.Assert):
            return emit("assert", test=lower(n.test), message=lower(n.msg))
        return self.c.unknown(type(n).__name__, loc)
