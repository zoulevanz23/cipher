import asyncio
import json
import re

import httpx

from .scanner import ScanResult, Vulnerability

NPM_REGISTRY = "https://registry.npmjs.org"
PYPI_REGISTRY = "https://pypi.org/pypi"
MAX_CONCURRENT = 10


def _extract_fixed_versions(vulnerabilities: list[Vulnerability]) -> list[str]:
    fixed = []
    for v in vulnerabilities:
        for av in v.affected_versions:
            m = re.match(r"fixed:\s*([\w.]+)", av)
            if m:
                fixed.append(m.group(1))
    return fixed


def _compare_versions(a: str, b: str) -> int:
    """Compare two semver-like version strings. Returns -1, 0, or 1."""
    def parts(v):
        return [int(x) for x in re.findall(r"\d+", v)]
    pa, pb = parts(a), parts(b)
    for i in range(max(len(pa), len(pb))):
        va = pa[i] if i < len(pa) else 0
        vb = pb[i] if i < len(pb) else 0
        if va < vb:
            return -1
        if va > vb:
            return 1
    return 0


def _max_version(versions: list[str]) -> str | None:
    if not versions:
        return None
    best = versions[0]
    for v in versions[1:]:
        if _compare_versions(v, best) > 0:
            best = v
    return best


async def _query_npm_latest(client: httpx.AsyncClient, sem: asyncio.Semaphore, name: str) -> str | None:
    try:
        async with sem:
            resp = await client.get(f"{NPM_REGISTRY}/{name}", timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("dist-tags", {}).get("latest")
    except Exception:
        return None


async def _query_pypi_latest(client: httpx.AsyncClient, sem: asyncio.Semaphore, name: str) -> str | None:
    try:
        async with sem:
            resp = await client.get(f"{PYPI_REGISTRY}/{name}/json", timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("info", {}).get("version")
    except Exception:
        return None


_REGISTRY_QUERIERS = {
    "npm": _query_npm_latest,
    "pypi": _query_pypi_latest,
}


async def _query_latest_version(client: httpx.AsyncClient, sem: asyncio.Semaphore, ecosystem: str, name: str) -> str | None:
    querier = _REGISTRY_QUERIERS.get(ecosystem)
    if querier:
        return await querier(client, sem, name)
    return None


async def compute_fixes(results: list[ScanResult]) -> list[dict]:
    fixes = []
    vulnerable_packages = [r for r in results if r.vulnerabilities]
    if not vulnerable_packages:
        return fixes

    sem = asyncio.Semaphore(MAX_CONCURRENT)
    async with httpx.AsyncClient() as client:
        tasks = []
        for r in vulnerable_packages:
            eco = r.package.ecosystem if hasattr(r.package, "ecosystem") and r.package.ecosystem else "npm"
            tasks.append(_query_latest_version(client, sem, eco, r.package.name))

        latest_versions = await asyncio.gather(*tasks)

    for r, latest in zip(vulnerable_packages, latest_versions):
        fixed_versions = _extract_fixed_versions(r.vulnerabilities)
        max_fixed = _max_version(fixed_versions)
        recommended = max_fixed or latest or r.package.version

        fixes.append({
            "package_name": r.package.name,
            "current_version": r.package.version,
            "fixed_version": max_fixed or "unknown",
            "latest_version": latest or "unknown",
            "recommended_version": recommended,
            "ecosystem": r.package.ecosystem if hasattr(r.package, "ecosystem") and r.package.ecosystem else "npm",
        })

    return fixes


def generate_fixed_package_json(package_json_str: str, fixes: list[dict]) -> str:
    try:
        data = json.loads(package_json_str)
    except json.JSONDecodeError:
        return package_json_str

    fix_map = {f["package_name"]: f["recommended_version"] for f in fixes}

    for section in ("dependencies", "devDependencies"):
        deps = data.get(section, {})
        for pkg_name in deps:
            if pkg_name in fix_map:
                raw_ver = deps[pkg_name]
                new_ver = fix_map[pkg_name]
                if raw_ver.startswith("^") or raw_ver.startswith("~"):
                    prefix = raw_ver[0]
                    deps[pkg_name] = f"{prefix}{new_ver}"
                else:
                    deps[pkg_name] = new_ver

    return json.dumps(data, indent=2) + "\n"
