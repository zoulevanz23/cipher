import asyncio
from datetime import datetime, timezone

import httpx

from .parser import Package

MAX_CONCURRENT = 10
NPM_REGISTRY = "https://registry.npmjs.org"
PYPI_REGISTRY = "https://pypi.org/pypi"
UNMAINTAINED_YEARS = 2


async def _query_npm_info(client: httpx.AsyncClient, sem: asyncio.Semaphore, name: str) -> tuple[str, str]:
    try:
        async with sem:
            resp = await client.get(f"{NPM_REGISTRY}/{name}", timeout=15)
        resp.raise_for_status()
        data = resp.json()
        license_val = data.get("license", "") or ""
        pkg_data = data.get("time", {})
        last_modified = ""
        for ver in sorted(pkg_data.keys(), key=lambda k: pkg_data.get(k, ""), reverse=True):
            ts = pkg_data.get(ver)
            if ts:
                last_modified = ts
                break
        return license_val, last_modified
    except Exception:
        return "", ""


async def _query_pypi_info(client: httpx.AsyncClient, sem: asyncio.Semaphore, name: str) -> tuple[str, str]:
    try:
        async with sem:
            resp = await client.get(f"{PYPI_REGISTRY}/{name}/json", timeout=15)
        resp.raise_for_status()
        data = resp.json()
        info = data.get("info", {})
        license_val = info.get("license", "") or ""
        last_modified = info.get("last_serial", "") or ""
        return license_val, str(last_modified)
    except Exception:
        return "", ""


_REGISTRY_QUERIERS = {
    "npm": _query_npm_info,
    "pypi": _query_pypi_info,
}


async def _query_info(client: httpx.AsyncClient, sem: asyncio.Semaphore, ecosystem: str, name: str) -> tuple[str, str]:
    querier = _REGISTRY_QUERIERS.get(ecosystem)
    if querier:
        return await querier(client, sem, name)
    return "", ""


async def fetch_package_info(packages: list[Package]) -> dict[str, dict]:
    results: dict[str, dict] = {}
    sem = asyncio.Semaphore(MAX_CONCURRENT)
    async with httpx.AsyncClient() as client:
        tasks = []
        for pkg in packages:
            eco = pkg.ecosystem if pkg.ecosystem else "npm"
            tasks.append(_query_info(client, sem, eco, pkg.name))
        infos = await asyncio.gather(*tasks)
    for pkg, (lic, last_mod) in zip(packages, infos):
        results[pkg.name] = {"license": lic, "last_updated": last_mod}
    return results


def is_unmaintained(last_updated_str: str) -> bool:
    if not last_updated_str:
        return False
    try:
        dt = datetime.fromisoformat(last_updated_str.replace("Z", "+00:00"))
        delta = datetime.now(timezone.utc) - dt
        return delta.days > 365 * UNMAINTAINED_YEARS
    except (ValueError, TypeError):
        return False
