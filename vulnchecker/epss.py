import httpx

from .cache import get_cache, set_cache

EPSS_API = "https://api.first.org/data/v1/epss"
CHUNK_SIZE = 500


def _cve_id(vuln) -> str | None:
    """Return a canonical CVE id for a normalized vuln, or None."""
    for alias in vuln.aliases:
        if alias.startswith("CVE-"):
            return alias
    if vuln.id.startswith("CVE-"):
        return vuln.id
    return None


async def enrich_epss(cve_ids: list[str], client: httpx.AsyncClient | None = None) -> dict:
    """Fetch EPSS scores. Returns {cve_id: {"epss_score": float|None, "epss_percentile": float|None}}.

    Cached on disk; never raises (network failures yield None scores).
    """
    if not cve_ids:
        return {}

    out: dict[str, dict] = {}
    missing: list[str] = []
    for cve in cve_ids:
        hit = get_cache("epss", cve)
        if hit is not None and isinstance(hit, dict) and "epss_score" in hit:
            out[cve] = hit
        else:
            missing.append(cve)

    if not missing:
        return out

    chunks = [missing[i:i + CHUNK_SIZE] for i in range(0, len(missing), CHUNK_SIZE)]

    async def _fetch(chunk: list[str]) -> None:
        try:
            resp = await client.get(EPSS_API, params={"cve": ",".join(chunk)})
            if resp.status_code != 200:
                return
            data = resp.json()
            found = set()
            for item in data.get("data", []):
                cve = item.get("cve")
                if not cve:
                    continue
                score = item.get("epss")
                percentile = item.get("percentile")
                val = {
                    "epss_score": float(score) if score is not None else None,
                    "epss_percentile": float(percentile) if percentile is not None else None,
                }
                found.add(cve)
                out[cve] = val
                set_cache("epss", cve, val)
            for cve in chunk:
                if cve not in found:
                    val = {"epss_score": None, "epss_percentile": None}
                    out.setdefault(cve, val)
                    set_cache("epss", cve, val)
        except (httpx.HTTPError, ValueError):
            pass

    if client is not None:
        for chunk in chunks:
            await _fetch(chunk)
    else:
        async with httpx.AsyncClient(timeout=20) as c:
            for chunk in chunks:
                await _fetch(chunk)

    return out


__all__ = ["enrich_epss", "_cve_id"]
