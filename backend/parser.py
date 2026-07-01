import json
import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Package:
    name: str
    version: str
    type: str = "dependency"


def clean_version(raw: str) -> str:
    v = raw.strip()
    if v.startswith("^") or v.startswith("~"):
        v = v[1:]
    v = v.split("||")[0].strip()
    v = re.sub(r"[^\d\.]", "", v.split("-")[0])
    return v


def parse_package_json(content: str) -> list[Package]:
    data = json.loads(content)
    packages: list[Package] = []

    for key, value in data.get("dependencies", {}).items():
        packages.append(Package(name=key, version=clean_version(value), type="dependency"))

    for key, value in data.get("devDependencies", {}).items():
        packages.append(Package(name=key, version=clean_version(value), type="devDependency"))

    return packages


def parse_package_lock(content: str) -> list[Package]:
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
            packages.append(
                Package(name=pkg_name, version=clean_version(resolved_version), type="dependency")
            )

    return packages


def parse_yarn_lock(content: str) -> list[Package]:
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
                    packages.append(Package(name=pkg_name, version=vm.group(1), type="dependency"))
                    break
                i += 1
        i += 1

    return packages


def parse_dependencies(
    package_json_str: Optional[str] = None,
    lock_file_str: Optional[str] = None,
    lock_file_type: str = "package-lock.json",
) -> list[Package]:
    if lock_file_str:
        if lock_file_type == "package-lock.json":
            return parse_package_lock(lock_file_str)
        elif lock_file_type == "yarn.lock":
            return parse_yarn_lock(lock_file_str)

    if package_json_str:
        return parse_package_json(package_json_str)

    return []
