import json
import os
from pathlib import Path
from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {
    "path": ".",
    "min_severity": "low",
    "fail_on": "none",
    "ecosystem": None,
    "format": "table",
    "output": None,
    "no_color": False,
    "quiet": False,
    "ignore": [],
    "ignore_until": {},
}

PROJECT_FILES = [".vulncheckerrc", ".vulnchecker.json"]
USER_CONFIG_DIR = Path.home() / ".config" / "vulnchecker"
USER_CONFIG_FILES = ["config.json", "config"]


def _load_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _load_pyproject_toml(path: Path) -> dict | None:
    try:
        import tomllib
    except ImportError:
        try:
            import tomli as tomllib
        except ImportError:
            return None
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
        return data.get("tool", {}).get("vulnchecker")
    except Exception:
        return None


def find_project_config(project_path: Path) -> dict:
    for filename in PROJECT_FILES:
        cfg = _load_json(project_path / filename)
        if cfg is not None:
            return cfg
    cfg = _load_pyproject_toml(project_path / "pyproject.toml")
    if cfg is not None:
        return cfg
    return {}


def find_user_config() -> dict:
    for filename in USER_CONFIG_FILES:
        cfg = _load_json(USER_CONFIG_DIR / filename)
        if cfg is not None:
            return cfg
    return {}


def merge_config(cli_args: dict) -> dict:
    project_cfg = find_project_config(Path(cli_args.get("path", ".")))
    user_cfg = find_user_config()

    result = dict(DEFAULT_CONFIG)
    result.update(user_cfg)
    result.update(project_cfg)

    for key in result:
        if cli_args.get(key) is not None:
            result[key] = cli_args[key]

    return result


def should_ignore(vuln_id: str, config: dict) -> bool:
    ignore_list = config.get("ignore", [])
    if vuln_id in ignore_list:
        return True
    ignore_until = config.get("ignore_until", {})
    if vuln_id in ignore_until:
        from datetime import datetime
        try:
            until = datetime.fromisoformat(ignore_until[vuln_id])
            if datetime.now() < until:
                return True
        except (ValueError, TypeError):
            pass
    return False


def init_config(path: Path) -> str:
    config_path = path / ".vulncheckerrc"
    if config_path.exists():
        return f"Config already exists at {config_path}"
    example = {
        "min_severity": "low",
        "fail_on": "none",
        "format": "table",
        "no_color": False,
        "quiet": False,
        "ignore": ["GHSA-xxxx-xxxx"],
        "ignore_until": {"GHSA-yyyy-yyyy": "2026-08-01"},
    }
    config_path.write_text(json.dumps(example, indent=2), encoding="utf-8")
    return f"Created {config_path}"
