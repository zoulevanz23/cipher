import re
from typing import Optional
from .parser import Package

# Very small static import scanner — no extra deps.
# JS/TS: import X from 'pkg' | require('pkg') | import('pkg')
# Py: import pkg / from pkg import ...
# Go: import "pkg"

JS_IMPORT_RE = re.compile(r"""(?:import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\))""")
PY_IMPORT_RE = re.compile(r"^\s*(?:import\s+([a-zA-Z0-9_\.]+)|from\s+([a-zA-Z0-9_\.]+)\s+import)", re.MULTILINE)
GO_IMPORT_RE = re.compile(r'"([^"]+)"')

def extract_imports(source_files: list[dict], ecosystem: str) -> set[str]:
    imports: set[str] = set()
    for f in source_files or []:
        content = f.get("content", "") or ""
        path = f.get("path", "") or ""
        # JS/TS
        if ecosystem == "npm" or path.endswith((".js", ".ts", ".jsx", ".tsx", ".mjs")):
            for a, b, c in JS_IMPORT_RE.findall(content):
                pkg = (a or b or c).split("/")[0].lstrip("@")
                # handle scoped: @babel/core -> @babel/core
                raw = a or b or c
                if raw.startswith("@"):
                    parts = raw.split("/")
                    if len(parts) >= 2:
                        pkg = f"{parts[0]}/{parts[1]}"
                    else:
                        pkg = raw
                if pkg:
                    imports.add(pkg)
        if ecosystem in ("pypi", "go") or path.endswith((".py", ".go")):
            for a, b in PY_IMPORT_RE.findall(content):
                pkg = (a or b).split(".")[0]
                if pkg:
                    imports.add(pkg)
            for m in GO_IMPORT_RE.findall(content):
                # go imports are URLs, keep last segment
                pkg = m.split("/")[-1]
                if pkg:
                    imports.add(pkg)
    return imports


def analyze_reachability(packages: list[Package], source_files: list[dict], ecosystem: str) -> dict[str, str]:
    """Return {package_name: reachable|unreachable|unknown}. If no source_files, all unknown."""
    if not source_files:
        return {p.name: "unknown" for p in packages}
    imports = extract_imports(source_files, ecosystem)
    # also consider direct deps as reachable if imported
    result: dict[str, str] = {}
    # build direct import set normalized
    norm_imports = {i.lower() for i in imports}
    for p in packages:
        if p.name.lower() in norm_imports:
            result[p.name] = "reachable"
        elif p.name.split("/")[-1].lower() in norm_imports:
            result[p.name] = "reachable"
        else:
            # transitive: if any dependency of a reachable package includes this
            # fallback to unknown if not directly imported, but mark as unreachable for now
            result[p.name] = "unreachable"
    # if nothing matched, keep unknown? but we have unreachable already
    return result


def dependency_paths(packages: list[Package]) -> dict[str, list[str]]:
    """Build simple path map: package -> [root ... pkg] using tree dependencies if available."""
    # packages may have .dependencies populated via tree.py
    path_map: dict[str, list[str]] = {}
    # build lookup by name
    by_name = {p.name: p for p in packages}
    # if tree has dependencies, walk
    for p in packages:
        if getattr(p, "dependencies", None):
            # package is root-like if its dependencies are populated
            stack = [(p, [p.name])]
            visited = set()
            while stack:
                cur, path = stack.pop()
                if cur.name in visited:
                    continue
                visited.add(cur.name)
                path_map[cur.name] = path
                for dep in cur.dependencies or []:
                    if dep.name not in path_map:
                        path_map[dep.name] = path + [dep.name]
                    stack.append((dep, path + [dep.name]))
    # fallback: direct packages get single path
    for p in packages:
        if p.name not in path_map:
            path_map[p.name] = [p.name]
    return path_map
