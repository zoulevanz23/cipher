import json
from typing import Optional

from .parsers.base import Package, clean_version
from .parsers.base import _parse_package_json, _parse_package_lock, _parse_yarn_lock


def parse_dependencies(
    package_json_str: Optional[str] = None,
    lock_file_str: Optional[str] = None,
    lock_file_type: str = "package-lock.json",
) -> list[Package]:
    if lock_file_str:
        if lock_file_type == "package-lock.json":
            return _parse_package_lock(lock_file_str)
        elif lock_file_type == "yarn.lock":
            return _parse_yarn_lock(lock_file_str)

    if package_json_str:
        return _parse_package_json(package_json_str)

    return []


__all__ = ["Package", "parse_dependencies", "clean_version"]
