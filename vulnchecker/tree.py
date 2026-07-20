import json
from .parser import Package


def build_tree_from_lock(lock_content: str, ecosystem: str = "npm") -> dict[str, Package]:
    packages: dict[str, Package] = {}
    try:
        data = json.loads(lock_content)
    except json.JSONDecodeError:
        return packages

    pkgs = data.get("packages", {})
    for path, info in pkgs.items():
        if path == "":
            continue
        name = path.split("node_modules/")[-1] if "node_modules/" in path else path
        ver = info.get("version", "")
        pkg = Package(name=name, version=ver, type="dependency", ecosystem=ecosystem)
        packages[path] = pkg

    for path, info in pkgs.items():
        if path == "" or path not in packages:
            continue
        deps = info.get("dependencies", {})
        if deps:
            pkg = packages[path]
            if pkg.dependencies is None:
                pkg.dependencies = []
            for dep_name, dep_ver in deps.items():
                dep_path = _find_dep_path(pkgs, path, dep_name)
                if dep_path and dep_path in packages:
                    pkg.dependencies.append(packages[dep_path])

    return packages


def _find_dep_path(pkgs: dict, parent_path: str, dep_name: str) -> str | None:
    parent_dir = parent_path.rsplit("/", 1)[0] if parent_path else ""
    candidates = [
        f"{parent_dir}/node_modules/{dep_name}",
        f"node_modules/{dep_name}",
    ]
    for c in candidates:
        if c in pkgs:
            return c
    return None


def flatten_tree(packages: dict[str, Package], root: str = "") -> list[Package]:
    result = []
    for path, pkg in packages.items():
        if not root or path.startswith(root):
            result.append(pkg)
    return result
