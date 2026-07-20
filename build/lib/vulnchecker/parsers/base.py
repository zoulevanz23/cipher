import json
import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class Package:
    name: str
    version: str
    type: str = "dependency"
    ecosystem: str = "npm"
    license: str = ""
    dependencies: list = None  # nested tree for lock file deps


def clean_version(raw: str) -> str:
    v = raw.strip()
    if v.startswith("^") or v.startswith("~"):
        v = v[1:]
    v = v.split("||")[0].strip()
    v = re.sub(r"[^\d\.]", "", v.split("-")[0])
    return v


def parse_npm(content: str, file_type: str = "package.json") -> list[Package]:
    if file_type == "package-lock.json":
        return _parse_package_lock(content)
    elif file_type == "yarn.lock":
        return _parse_yarn_lock(content)
    else:
        return _parse_package_json(content)


def _parse_package_json(content: str) -> list[Package]:
    data = json.loads(content)
    packages: list[Package] = []
    for key, value in data.get("dependencies", {}).items():
        packages.append(Package(name=key, version=clean_version(value), type="dependency", ecosystem="npm"))
    for key, value in data.get("devDependencies", {}).items():
        packages.append(Package(name=key, version=clean_version(value), type="devDependency", ecosystem="npm"))
    return packages


def _parse_package_lock(content: str) -> list[Package]:
    data = json.loads(content)
    packages: list[Package] = []
    seen: set[str] = set()
    for name, info in data.get("packages", {}).items():
        if name == "":
            continue
        pkg_name = name.lstrip("node_modules/")
        if pkg_name in seen:
            continue
        seen.add(pkg_name)
        resolved_version = info.get("version", "")
        if resolved_version:
            packages.append(Package(name=pkg_name, version=clean_version(resolved_version), type="dependency", ecosystem="npm"))
    return packages


def _parse_yarn_lock(content: str) -> list[Package]:
    packages: list[Package] = []
    seen: set[str] = set()
    pattern = re.compile(r'"?([^"]+?)"?:$')
    version_pattern = re.compile(r'^\s+version "([^"]+)"')
    lines = content.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        m = pattern.match(line)
        if m:
            spec = m.group(1)
            if spec.startswith("yarn") or spec == "__metadata":
                i += 1
                continue
            pkg_name = spec.rsplit("@", 1)[0] if spec.count("@") > 1 else spec
            pkg_name = pkg_name.lstrip('"').strip()
            if pkg_name in seen:
                i += 1
                continue
            seen.add(pkg_name)
            while i < len(lines):
                vm = version_pattern.match(lines[i])
                if vm:
                    packages.append(Package(name=pkg_name, version=vm.group(1), type="dependency", ecosystem="npm"))
                    break
                i += 1
        i += 1
    return packages


def parse_pypi(content: str, file_type: str = "requirements.txt") -> list[Package]:
    if file_type == "Pipfile.lock":
        return _parse_pipfile_lock(content)
    elif file_type == "Pipfile":
        return _parse_pipfile(content)
    elif file_type == "pyproject.toml":
        return _parse_pyproject_toml(content)
    else:
        return _parse_requirements_txt(content)


def _parse_requirements_txt(content: str) -> list[Package]:
    packages: list[Package] = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        if "==" in line:
            name, version = line.split("==", 1)
            packages.append(Package(name=name.strip(), version=version.strip(), type="dependency", ecosystem="pypi"))
        elif ">=" in line or "<=" in line or "!=" in line:
            name = re.split(r"[><=!~]+", line)[0].strip()
            if name:
                packages.append(Package(name=name, version="latest", type="dependency", ecosystem="pypi"))
        else:
            packages.append(Package(name=line, version="latest", type="dependency", ecosystem="pypi"))
    return packages


def _parse_pipfile_lock(content: str) -> list[Package]:
    data = json.loads(content)
    packages: list[Package] = []
    for section in ("default", "develop"):
        for name, info in data.get(section, {}).items():
            version = info.get("version", "")
            if version.startswith("=="):
                version = version[2:]
            packages.append(Package(name=name, version=version or "latest", type=section, ecosystem="pypi"))
    return packages


def _parse_pipfile(content: str) -> list[Package]:
    packages: list[Package] = []
    current_section = "packages"
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("["):
            section_name = line.strip("[]").lower()
            current_section = "dev-packages" if "dev" in section_name else "packages"
            continue
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            parts = line.split("=", 1)
            name = parts[0].strip().strip('"').strip("'")
            val = parts[1].strip().strip('"').strip("'")
            version = val if val != "*" else "latest"
            packages.append(Package(name=name, version=version, type="devDependency" if "dev" in current_section else "dependency", ecosystem="pypi"))
    return packages


def _parse_pyproject_toml(content: str) -> list[Package]:
    packages: list[Package] = []
    try:
        import tomllib
    except ImportError:
        try:
            import tomli as tomllib
        except ImportError:
            return packages
    try:
        data = tomllib.loads(content)
    except Exception:
        return packages

    for key in ("dependencies", "optional-dependencies"):
        deps = data.get("project", {}).get(key, [])
        if isinstance(deps, dict):
            deps = deps.values() if isinstance(next(iter(deps.values())), list) else deps
        if isinstance(deps, list):
            for dep in deps:
                if isinstance(dep, str):
                    m = re.match(r"^([A-Za-z0-9_.-]+)\s*(?:[><=!~]+\s*[\w.*]+)?", dep)
                    if m:
                        name = m.group(1)
                        m2 = re.match(rf"^{re.escape(name)}\s*([><=!~]+\s*[\w.*]+)", dep)
                        version = m2.group(1).strip() if m2 else "latest"
                        packages.append(Package(name=name, version=version, type="dependency", ecosystem="pypi"))
    return packages


def parse_go(content: str, file_type: str = "go.mod") -> list[Package]:
    packages: list[Package] = []
    in_require = False
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("require ("):
            in_require = True
            continue
        if in_require and line == ")":
            in_require = False
            continue
        if in_require:
            parts = re.split(r"\s+", line)
            if len(parts) >= 2:
                name = parts[0]
                version = parts[1]
                packages.append(Package(name=name, version=version, type="dependency", ecosystem="go"))
        elif line.startswith("require "):
            parts = re.split(r"\s+", line)
            if len(parts) >= 3:
                name = parts[1]
                version = parts[2]
                packages.append(Package(name=name, version=version, type="dependency", ecosystem="go"))
    return packages


def parse_maven(content: str, file_type: str = "pom.xml") -> list[Package]:
    packages: list[Package] = []
    group_id = ""
    artifact_id = ""
    version = ""
    in_dep = False
    for line in content.splitlines():
        line = line.strip()
        if "<dependency>" in line:
            in_dep = True
            group_id = artifact_id = version = ""
        if in_dep:
            m = re.search(r"<groupId>(.+?)</groupId>", line)
            if m:
                group_id = m.group(1)
            m = re.search(r"<artifactId>(.+?)</artifactId>", line)
            if m:
                artifact_id = m.group(1)
            m = re.search(r"<version>(.+?)</version>", line)
            if m:
                version = m.group(1)
        if "</dependency>" in line and in_dep:
            in_dep = False
            if artifact_id:
                packages.append(Package(name=f"{group_id}:{artifact_id}" if group_id else artifact_id, version=version or "latest", type="dependency", ecosystem="maven"))
    return packages


def parse_nuget(content: str, file_type: str = "packages.config") -> list[Package]:
    packages: list[Package] = []
    for line in content.splitlines():
        m = re.search(r'<package\s+id=["\']([^"\']+)["\']\s+version=["\']([^"\']+)["\']', line, re.IGNORECASE)
        if m:
            packages.append(Package(name=m.group(1), version=m.group(2), type="dependency", ecosystem="nuget"))
        m = re.search(r'<PackageReference\s+Include=["\']([^"\']+)["\']\s+Version=["\']([^"\']+)["\']', line, re.IGNORECASE)
        if m:
            packages.append(Package(name=m.group(1), version=m.group(2), type="dependency", ecosystem="nuget"))
    return packages


def parse_rubygems(content: str, file_type: str = "Gemfile.lock") -> list[Package]:
    packages: list[Package] = []
    if file_type == "Gemfile.lock":
        in_specs = False
        for line in content.splitlines():
            if line.strip() == "GEM":
                in_specs = False
            elif line.strip() == "SPECS":
                in_specs = True
                continue
            if in_specs:
                m = re.match(r"\s+(.+?)\s+\((.+?)\)", line)
                if m:
                    packages.append(Package(name=m.group(1), version=m.group(2), type="dependency", ecosystem="rubygems"))
    else:
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("gem ") and not line.startswith("#"):
                m = re.search(r'["\']([^"\']+)["\']', line)
                if m:
                    name = m.group(1)
                    vm = re.search(r'["\']~>\s*([^"\']+)["\']', line)
                    version = vm.group(1) if vm else "latest"
                    packages.append(Package(name=name, version=version, type="dependency", ecosystem="rubygems"))
    return packages


def parse_cargo(content: str, file_type: str = "Cargo.toml") -> list[Package]:
    packages: list[Package] = []
    in_deps = False
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("[dependencies") or line.startswith("[build-dependencies") or line.startswith("[dev-dependencies"):
            in_deps = True
            continue
        if line.startswith("[") and in_deps:
            in_deps = False
            continue
        if in_deps and "=" in line:
            parts = line.split("=", 1)
            name = parts[0].strip()
            val = parts[1].strip().strip('"').strip("'")
            if val == "*":
                version = "latest"
            elif val.startswith("{") and "version" in val:
                vm = re.search(r'version\s*=\s*["\']([^"\']+)["\']', val)
                version = vm.group(1) if vm else "latest"
            else:
                version = val
            packages.append(Package(name=name, version=version, type="dependency", ecosystem="cargo"))
    return packages
