import json
import re
from pathlib import Path
from typing import Optional


def detect_workspaces(project_path: Path) -> list[Path]:
    workspaces: list[Path] = []

    pnpm = project_path / "pnpm-workspace.yaml"
    if pnpm.exists():
        try:
            content = pnpm.read_text(encoding="utf-8")
            pkgs = re.findall(r'^\s*-\s+["\']?(.+?)["\']?\s*$', content, re.MULTILINE)
            for p in pkgs:
                resolved = list(project_path.glob(p))
                for r in resolved:
                    if r.is_dir() and (r / "package.json").exists():
                        workspaces.append(r)
        except Exception:
            pass
        return workspaces

    lerna = project_path / "lerna.json"
    if lerna.exists():
        try:
            data = json.loads(lerna.read_text(encoding="utf-8"))
            pkgs = data.get("packages", [])
            for p in pkgs:
                resolved = list(project_path.glob(p))
                for r in resolved:
                    if r.is_dir() and (r / "package.json").exists():
                        workspaces.append(r)
        except Exception:
            pass
        return workspaces

    pkg_json = project_path / "package.json"
    if pkg_json.exists():
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
            for key in ("workspaces", "workspace"):
                pkgs = data.get(key, [])
                if isinstance(pkgs, dict):
                    pkgs = pkgs.get("packages", [])
                for p in pkgs:
                    resolved = list(project_path.glob(p))
                    for r in resolved:
                        if r.is_dir() and (r / "package.json").exists():
                            workspaces.append(r)
        except Exception:
            pass

    return workspaces


def is_monorepo(project_path: Path) -> bool:
    checks = [
        project_path / "pnpm-workspace.yaml",
        project_path / "lerna.json",
        project_path / "nx.json",
        project_path / "turbo.json",
    ]
    for c in checks:
        if c.exists():
            return True
    pkg_json = project_path / "package.json"
    if pkg_json.exists():
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
            if data.get("workspaces"):
                return True
        except Exception:
            pass
    return False
