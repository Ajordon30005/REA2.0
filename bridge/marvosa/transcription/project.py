"""Resolve supplied modules from compiler-owned facts; never read the host.

The same resolver builds the dependency inventory and serves live graph imports.
Package metadata is extracted during the existing JSON parse, once. Resolution
does not install packages or guess external/dynamic dependencies.
"""
from pathlib import PurePosixPath

from .kernel import Unsupported


def normalize(path):
    parts = []
    for part in path.split("/"):
        if part == "..":
            if not parts:
                raise Unsupported("Dependency leaves the supplied project")
            parts.pop()
        elif part not in ("", "."):
            parts.append(part)
    return "/".join(parts)


class Project:
    def __init__(self, modules, manifests=None):
        self.modules = {item["path"]: item for item in modules}
        self.manifests = manifests or {}

    def file(self, stem, language):
        suffixes = ("", ".py") if language == "python" else ("", ".js", ".json", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".wasm")
        for suffix in suffixes:
            candidate = stem + suffix
            if candidate in self.modules:
                return candidate
        return None

    def folder(self, stem, language, seen=None):
        seen = set() if seen is None else seen
        if stem in seen:
            raise Unsupported("Circular package main: " + stem)
        seen.add(stem)
        prefix = stem + "/" if stem else ""
        manifest = self.manifests.get(prefix + "package.json", {})
        main = manifest.get("main")
        if language != "python" and isinstance(main, str) and main:
            path = normalize(prefix + main)
            result = self.file(path, language)
            if result is None and path != stem:
                result = self.folder(path, language, seen)
            if result:
                return result
        return self.file(prefix + ("__init__" if language == "python" else "index"), language)

    def resolve(self, importer, specifier):
        language = self.modules[importer]["language"]
        if specifier == "hcl:wasm" or language == "python" and specifier == "math":
            return {"status": "boundary", "target": specifier}
        if not isinstance(specifier, str) or not specifier:
            raise Unsupported("Module specifier must be a nonempty string")
        parent = str(PurePosixPath(importer).parent)
        candidates = []
        if language == "python":
            if specifier.startswith("."):
                dots = len(specifier) - len(specifier.lstrip("."))
                candidates.append(normalize(parent + "/" + "../" * (dots - 1) + specifier[dots:].replace(".", "/")))
            else:
                candidates.append(specifier.replace(".", "/"))
        elif specifier.startswith("."):
            candidates.append(normalize(parent + "/" + specifier))
        elif specifier.startswith("/") or ":" in specifier:
            raise Unsupported("External dependency was not supplied: " + specifier)
        else:
            parts = specifier.split("/")
            count = 2 if specifier.startswith("@") else 1
            package, subpath = "/".join(parts[:count]), "/".join(parts[count:])
            base = PurePosixPath(parent)
            while True:
                stem = normalize(str(base / "node_modules" / package))
                manifest = self.manifests.get(stem + "/package.json", {})
                if "exports" in manifest:
                    # Conditional/wildcard maps must not silently fall through
                    # to private files or a different package's copy.
                    exports = manifest["exports"]
                    target = exports if isinstance(exports, str) and not subpath else \
                        exports.get("./" + subpath if subpath else ".") if isinstance(exports, dict) else None
                    if not isinstance(target, str) or not target.startswith("./"):
                        raise Unsupported("Package export needs an explicit condition/subpath adapter: " + specifier)
                    path = normalize(stem + "/" + target)
                    if not path.startswith(stem + "/") or path not in self.modules:
                        raise Unsupported("Package export target was not supplied: " + specifier)
                    return {"status": "resolved", "target": path}
                candidates.append(stem + ("/" + subpath if subpath else ""))
                if str(base) == ".":
                    break
                base = base.parent
            # Also support an explicitly supplied module rooted at the target.
            candidates.append(normalize(specifier))
        for candidate in candidates:
            found = self.file(candidate, language) or self.folder(candidate, language)
            if found:
                return {"status": "resolved", "target": found}
        raise Unsupported("Dependency was not supplied: " + specifier)

    def inventory(self):
        dependencies = []
        def visit(node, importer):
            if isinstance(node, list):
                for child in node:
                    visit(child, importer)
            elif isinstance(node, dict):
                specs = []
                if node.get("kind") == "import":
                    specs = [entry["module"] for entry in node["entries"]]
                elif node.get("kind") == "reexport":
                    specs = [node["module"]]
                elif node.get("kind") == "call" and node["callee"].get("kind") == "name" and node["callee"].get("name") == "require":
                    args = node["arguments"]
                    specs = [args[0]["value"] if len(args) == 1 and args[0].get("kind") == "literal" and isinstance(args[0].get("value"), str) else None]
                for spec in dict.fromkeys(specs):
                    item = {"source": node["id"], "module": importer, "specifier": spec}
                    try:
                        item.update(self.resolve(importer, spec) if spec is not None else
                                    {"status": "dynamic", "reason": "Specifier is computed by the graph"})
                    except Unsupported as error:
                        item.update(status="unresolved", reason=str(error))
                    dependencies.append(item)
                for value in node.values():
                    if isinstance(value, (dict, list)):
                        visit(value, importer)
        for path, module in self.modules.items():
            visit(module["body"], path)
        entry = self.folder("", "javascript")
        if entry is None:
            executable = [path for path, module in self.modules.items() if module["language"] in ("python", "javascript", "wasm")]
            if len(executable) == 1:
                entry = executable[0]
            elif len(self.modules) == 1:
                entry = next(iter(self.modules))
        return {"entry_module": entry, "manifests": self.manifests, "dependencies": dependencies}
