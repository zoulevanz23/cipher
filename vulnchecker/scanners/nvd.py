import asyncio
from typing import Optional

import httpx

from ..normalize import NormalizedVuln, cvss_to_severity
from ..cache import get_cache, set_cache

NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
MAX_RETRIES = 2
RETRY_DELAY = 0.5
MAX_CONCURRENT = 3


def _parse_nvd_cve(cve_item: dict) -> Optional[NormalizedVuln]:
    cve = cve_item.get("cve", {})
    cve_id = cve.get("id", "")
    if not cve_id:
        return None

    descriptions = cve.get("descriptions", [])
    summary = ""
    for desc in descriptions:
        if desc.get("lang") == "en":
            summary = desc.get("value", "")
            break

    cvss_score: Optional[float] = None
    cvss_vector = ""
    metrics = cve.get("metrics", {})

    for source in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(source, [])
        if entries:
            cvss_data = entries[0].get("cvssData", {})
            score = cvss_data.get("baseScore")
            if score is not None:
                try:
                    cvss_score = float(score)
                except (ValueError, TypeError):
                    pass
            cvss_vector = cvss_data.get("vectorString", "")
            if cvss_score is not None:
                break

    severity = cvss_to_severity(cvss_score)

    cwe_id = ""
    weaknesses = cve.get("weaknesses", [])
    for w in weaknesses:
        for desc in w.get("description", []):
            val = desc.get("value", "")
            if val.startswith("CWE-"):
                cwe_id = val
                break
        if cwe_id:
            break

    published = cve.get("published", "")
    modified = cve.get("lastModified", "")
    references = []
    for ref in cve.get("references", []):
        url = ref.get("url", "")
        if url:
            references.append({"url": url})

    return NormalizedVuln(
        id=cve_id,
        summary=summary,
        aliases=[cve_id],
        severity=severity,
        cvss_score=cvss_score,
        cvss_vector=cvss_vector,
        cwe_id=cwe_id,
        published=published[:10] if published else "",
        modified=modified[:10] if modified else "",
        references=references,
        source="nvd",
    )


async def enrich_cves(
    cve_ids: list[str],
    api_key: str = "",
    client: httpx.AsyncClient | None = None,
) -> list[NormalizedVuln]:
    if not cve_ids:
        return []

    sem = asyncio.Semaphore(MAX_CONCURRENT)

    async def _runs(c: httpx.AsyncClient) -> list[NormalizedVuln]:
        results: list[NormalizedVuln] = []
        tasks = [_fetch_cve(c, sem, cve_id, api_key) for cve_id in cve_ids]
        for r in await asyncio.gather(*tasks):
            if r:
                results.append(r)
        return results

    if client is not None:
        return await _runs(client)
    async with httpx.AsyncClient(timeout=15) as c:
        return await _runs(c)


async def _fetch_cve(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    cve_id: str,
    api_key: str = "",
) -> Optional[NormalizedVuln]:
    cached = get_cache("nvd", cve_id)
    if cached is not None:
        return _parse_nvd_cve(cached) if isinstance(cached, dict) else None

    params: dict[str, str] = {"cveId": cve_id}
    headers = {}
    if api_key:
        headers["apiKey"] = api_key

    for attempt in range(MAX_RETRIES):
        try:
            async with sem:
                resp = await client.get(NVD_API, params=params, headers=headers)
            if resp.status_code == 404:
                return None
            if resp.status_code == 403:
                await asyncio.sleep(RETRY_DELAY * 2)
                continue
            resp.raise_for_status()
            data = resp.json()
            vulns = data.get("vulnerabilities", [])
            if not vulns:
                return None
            entry = vulns[0]
            set_cache("nvd", cve_id, entry)
            return _parse_nvd_cve(entry)
        except httpx.RequestError:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return None
        except Exception:
            return None
