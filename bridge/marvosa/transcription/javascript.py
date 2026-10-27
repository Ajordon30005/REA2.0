"""Babel syntax supplied by REA's existing inert parser; no JavaScript eval."""


class JavaScriptFrontend:
    def __init__(self, compiler):
        self.c = compiler
        self.strict = False

    def statements(self, nodes):
        return [self.lower(node) for node in nodes]

    def lower(self, n):
        if n is None:
            return self.c.node("literal", value=None)
        kind = n["type"]
        loc = n.get("loc") or {}
        location = {"line": loc.get("start", {}).get("line", 1),
                    "column": loc.get("start", {}).get("column", 0),
                    "end_line": loc.get("end", {}).get("line", 1),
                    "end_column": loc.get("end", {}).get("column", 0),
                    "start": n.get("start"), "end": n.get("end")}
        emit = lambda kind, **fields: self.c.node(kind, location, **fields)
        lower = self.lower
        if kind in ("NumericLiteral", "BigIntLiteral", "DecimalLiteral"):
            token = n.get("extra", {}).get("raw", str(n.get("value"))).replace("_", "").rstrip("nm")
            if token.lower().startswith(("0x", "0o", "0b")):
                token = str(int(token, 0))
            return emit("literal", value=token, numeric=True)
        if kind in ("StringLiteral", "BooleanLiteral", "NullLiteral"):
            return emit("literal", value=n.get("value"))
        if kind == "ThisExpression":
            return emit("this")
        if kind == "Identifier":
            return emit("name", name=n["name"])
        if kind in ("ArrayExpression", "ArrayPattern"):
            if any(item is None or item["type"] == "SpreadElement" for item in n["elements"]):
                return self.c.unknown("sparse/spread array", location)
            return emit("array", items=[lower(v) for v in n["elements"]])
        if kind == "AssignmentPattern":
            return emit("default_pattern", target=lower(n["left"]), value=lower(n["right"]))
        if kind == "ObjectPattern":
            pairs = []
            for item in n["properties"]:
                if item["type"] != "ObjectProperty":
                    return self.c.unknown("object rest binding", location)
                key = lower(item["key"]) if item["computed"] or item["key"]["type"] != "Identifier" else emit("literal", value=item["key"]["name"])
                pairs.append([key, lower(item["value"])])
            return emit("object_pattern", pairs=pairs)
        if kind == "ObjectExpression":
            pairs = []
            for item in n["properties"]:
                if item["type"] not in ("ObjectProperty", "ObjectMethod") or item.get("kind", "method") not in ("method", "init"):
                    return self.c.unknown(item["type"] + " accessor/spread", location)
                key = lower(item["key"]) if item["computed"] or item["key"]["type"] != "Identifier" else emit("literal", value=item["key"]["name"])
                pairs.append([key, lower(item if item["type"] == "ObjectMethod" else item["value"])])
            return emit("object", pairs=pairs)
        if kind == "BinaryExpression":
            return emit("binary", operator=n["operator"], left=lower(n["left"]), right=lower(n["right"]))
        if kind == "LogicalExpression":
            return emit("logical", operator=n["operator"], values=[lower(n["left"]), lower(n["right"])])
        if kind == "UnaryExpression":
            return emit("unary", operator=n["operator"], value=lower(n["argument"]))
        if kind == "ConditionalExpression":
            return emit("select", test=lower(n["test"]), yes=lower(n["consequent"]), no=lower(n["alternate"]))
        if kind == "MemberExpression":
            if n["computed"]:
                return emit("index", object=lower(n["object"]), index=lower(n["property"]))
            return emit("member", object=lower(n["object"]), property=n["property"]["name"])
        if kind in ("CallExpression", "NewExpression"):
            if any(v["type"] == "SpreadElement" for v in n["arguments"]):
                return self.c.unknown("spread arguments", location)
            return emit("call", callee=lower(n["callee"]), arguments=[lower(v) for v in n["arguments"]],
                        keywords={}, construct=kind == "NewExpression")
        if kind in ("ClassDeclaration", "ClassExpression"):
            if n.get("superClass") or n.get("decorators"):
                return self.c.unknown("class inheritance/decorators", location)
            methods, fields = [], []
            for method in n["body"]["body"]:
                if method.get("computed"):
                    return self.c.unknown("computed class member key", location)
                if method["type"] == "ClassProperty" and not method.get("decorators"):
                    if method.get("declare"):
                        continue
                    key = lower(method["key"]) if method["computed"] or method["key"]["type"] != "Identifier" else emit("literal", value=method["key"]["name"])
                    initializer = self.c.function("<field>", [], lambda: [emit("return", value=lower(method["value"]) if method.get("value") is not None else emit("name", name="undefined"))], location)
                    initializer.update(declaration=False, strict=True)
                    fields.append({"key": key, "function": initializer, "static": method.get("static", False)})
                    continue
                if method["type"] != "ClassMethod" or method.get("kind") not in ("method", "constructor"):
                    return self.c.unknown("class fields/private/accessor methods", location)
                key = lower(method["key"]) if method["computed"] or method["key"]["type"] != "Identifier" else emit("literal", value=method["key"]["name"])
                methods.append({"key": key, "function": lower(method), "static": method.get("static", False),
                                "constructor": method["kind"] == "constructor"})
            return emit("class", name=(n.get("id") or {}).get("name", "<anonymous>"),
                        methods=methods, fields=fields, declaration=kind == "ClassDeclaration")
        if kind in ("FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod"):
            if n.get("async") or n.get("generator"):
                return self.c.unknown("async/generator function", location)
            name = (n.get("id") or {}).get("name", "<anonymous>")
            params, defaults, rest = [], {}, None
            for param in n["params"]:
                if param["type"] == "Identifier":
                    params.append(param["name"])
                elif param["type"] == "AssignmentPattern" and param["left"]["type"] == "Identifier":
                    params.append(param["left"]["name"])
                    defaults[params[-1]] = lower(param["right"])
                elif param["type"] == "RestElement" and param["argument"]["type"] == "Identifier":
                    rest = param["argument"]["name"]
                else:
                    return self.c.unknown("destructured function parameters", location)
            previous_strict = self.strict
            self.strict = self.strict or kind == "ClassMethod" or any(
                d.get("value", {}).get("value") == "use strict" for d in n["body"].get("directives", []))
            def body():
                if n["body"]["type"] == "BlockStatement":
                    return self.statements(n["body"]["body"])
                return [emit("return", value=lower(n["body"]))]
            node = self.c.function(name, params, body, location, defaults, rest)
            node["declaration"] = kind == "FunctionDeclaration"
            node["arrow"] = kind == "ArrowFunctionExpression"
            node["method"] = kind in ("ObjectMethod", "ClassMethod")
            node["strict"] = self.strict
            self.strict = previous_strict
            return node
        if kind == "VariableDeclaration":
            if n.get("declare"):
                return emit("pass")
            return emit("declarations", mode=n["kind"], entries=[
                {"target": lower(d["id"]), "value": lower(d["init"]) if d.get("init") is not None else None}
                for d in n["declarations"]])
        if kind == "AssignmentExpression":
            if n["operator"] == "=":
                return emit("assign", targets=[lower(n["left"])], value=lower(n["right"]))
            return emit("update", target=lower(n["left"]), operator=n["operator"][:-1], value=lower(n["right"]), prefix=True)
        if kind == "UpdateExpression":
            return emit("update", target=lower(n["argument"]), operator="+" if n["operator"] == "++" else "-",
                        value=emit("literal", value="1", numeric=True), prefix=n["prefix"])
        if kind == "ExpressionStatement":
            return emit("expression", value=lower(n["expression"]))
        if kind == "SequenceExpression":
            return emit("sequence", values=[lower(v) for v in n["expressions"]])
        if kind == "BlockStatement":
            return emit("block", body=self.statements(n["body"]))
        if kind == "ReturnStatement":
            return emit("return", value=lower(n["argument"]) if n.get("argument") is not None else emit("name", name="undefined"))
        if kind == "IfStatement":
            return emit("if", test=lower(n["test"]), yes=[lower(n["consequent"])],
                        no=[lower(n["alternate"])] if n.get("alternate") else [])
        if kind == "WhileStatement":
            return emit("while", test=lower(n["test"]), body=[lower(n["body"])], otherwise=[])
        if kind == "DoWhileStatement":
            return emit("while", test=lower(n["test"]), body=[lower(n["body"])], otherwise=[], post=True)
        if kind == "ForStatement":
            return emit("for", init=lower(n["init"]) if n.get("init") else None,
                        test=lower(n["test"]) if n.get("test") else emit("literal", value=True),
                        update=lower(n["update"]) if n.get("update") else None, body=[lower(n["body"])])
        if kind in ("ForOfStatement", "ForInStatement"):
            target = n["left"]
            mode = None
            if target["type"] == "VariableDeclaration" and len(target["declarations"]) == 1:
                mode = target["kind"]
                target = target["declarations"][0]["id"]
            return emit("foreach", target=lower(target), iterable=lower(n["right"]), body=[lower(n["body"])], otherwise=[], mode=mode, keys=kind == "ForInStatement")
        if kind in ("BreakStatement", "ContinueStatement", "EmptyStatement"):
            return emit({"BreakStatement": "break", "ContinueStatement": "continue", "EmptyStatement": "pass"}[kind],
                        label=(n.get("label") or {}).get("name"))
        if kind == "LabeledStatement":
            body = lower(n["body"])
            labels = [n["label"]["name"]]
            if body["kind"] == "label":
                labels += body["labels"]
                body = body["body"]
            if body["kind"] in ("while", "for", "foreach"):
                body["labels"] = labels
            return emit("label", labels=labels, body=body)
        if kind == "TryStatement":
            handler = n.get("handler")
            return emit("try", body=lower(n["block"]),
                        handler=lower(handler["body"]) if handler else None,
                        binding=lower(handler["param"]) if handler and handler.get("param") else None,
                        finalizer=lower(n["finalizer"]) if n.get("finalizer") else None)
        if kind == "ThrowStatement":
            return emit("throw", value=lower(n["argument"]))
        if kind == "SwitchStatement":
            return emit("switch", value=lower(n["discriminant"]), cases=[
                {"test": lower(case["test"]) if case.get("test") else None,
                 "body": self.statements(case["consequent"])} for case in n["cases"]])
        if kind == "ImportDeclaration":
            if n.get("importKind") == "type":
                return emit("pass")
            return emit("import", entries=[{"module": n["source"]["value"],
                        "name": spec["imported"]["name"] if spec["type"] == "ImportSpecifier" else
                                "default" if spec["type"] == "ImportDefaultSpecifier" else None,
                        "alias": spec["local"]["name"]} for spec in n["specifiers"] if spec.get("importKind") != "type"])
        if kind == "ExportDefaultDeclaration":
            return emit("export", name="default", value=lower(n["declaration"]))
        if kind == "ExportNamedDeclaration":
            if n.get("exportKind") == "type":
                return emit("pass")
            if n.get("source"):
                if any(item["type"] != "ExportSpecifier" for item in n["specifiers"]):
                    return self.c.unknown("namespace re-export", location)
                return emit("reexport", module=n["source"]["value"], names=[
                    {"local": item["local"]["name"], "exported": item["exported"]["name"]}
                    for item in n["specifiers"] if item.get("exportKind") != "type"])
            return emit("export_names", declaration=lower(n["declaration"]) if n.get("declaration") else None,
                        names=[{"local": s["local"]["name"], "exported": s["exported"]["name"]} for s in n["specifiers"]])
        if kind in ("TSAsExpression", "TSTypeAssertion", "TSNonNullExpression", "TSSatisfiesExpression", "ParenthesizedExpression"):
            return lower(n["expression"])
        if kind in ("TSInterfaceDeclaration", "TSTypeAliasDeclaration", "TSDeclareFunction"):
            return emit("pass")
        return self.c.unknown(kind, location)
