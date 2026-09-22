import asyncio
from dataclasses import dataclass, field

import httpx

from .parser import Package
from .normalize import NormalizedVuln, merge_vulns, cvss_to_severity
from .scanners.nvd import enrich_cves
from .epss import enrich_epss
from .cache import get_cache, set_cache

OSV_API = "https://api.osv.dev/v1"
RETRY_DELAY = 1.0
MAX_RETRIES = 3
MAX_CONCURRENT = 20
BATCH_LIMIT = 100


class OSVUnavailableError(Exception):
    def __init__(self, status: str = "offline", message: str = "OSV API unreachable"):
        self.status = status
        self.message = message
        super().__init__(message)


@dataclass
class Vulnerability:
    id: str
    summary: str
    aliases: list[str] = field(default_factory=list)
    severity: str = "UNKNOWN"
    published: str = ""
    modified: str = ""
    affected_versions: list[str] = field(default_factory=list)
    references: list[dict] = field(default_factory=list)
    cvss_score: float | None = None
    cvss_vector: str = ""
    cwe_id: str = ""
    source: str = "osv"
    epss_score: float | None = None
    epss_percentile: float | None = None


@dataclass
class ScanResult:
    package: Package
    vulnerabilities: list[Vulnerability] = field(default_factory=list)
    unmaintained: bool = False
    health_score: int = 100
    sources_used: list[str] = field(default_factory=lambda: ["osv"])
    status: str = "ok"
    error: str | None = None

    @property
    def max_severity(self) -> str:
        severities = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "UNKNOWN": 0}
        return max(
            (v.severity for v in self.vulnerabilities),
            key=lambda s: severities.get(s, 0),
            default="NONE",
        )


SEVERITY_MAP = {
    "CRITICAL": "CRITICAL",
    "HIGH": "HIGH",
    "MODERATE": "MEDIUM",
    "MEDIUM": "MEDIUM",
    "LOW": "LOW",
}


def _parse_severity(osv_entry: dict) -> str:
    severity = "UNKNOWN"
    db_specific = osv_entry.get("database_specific", {})
    if isinstance(db_specific, dict):
        sev = db_specific.get("severity", "")
        if isinstance(sev, str) and sev.upper() in SEVERITY_MAP:
            severity = SEVERITY_MAP[sev.upper()]

    for severity_entry in osv_entry.get("severity", []):
        val = severity_entry.get("score", "")
        if val:
            try:
                cvss_score = float(val)
                if cvss_score >= 9.0:
                    severity = "CRITICAL"
                elif cvss_score >= 7.0:
                    severity = "HIGH"
                elif cvss_score >= 4.0:
                    severity = "MEDIUM"
                elif cvss_score > 0:
                    severity = "LOW"
            except ValueError:
                pass
    return severity


def _parse_osv_entry(osv_entry: dict) -> NormalizedVuln:
    aliases = osv_entry.get("aliases", [])
    affected_versions = []
    for affected in osv_entry.get("affected", []):
        for r in affected.get("ranges", []):
            for event in r.get("events", []):
                if "introduced" in event:
                    affected_versions.append(f"introduced: {event['introduced']}")
                if "fixed" in event:
                    affected_versions.append(f"fixed: {event['fixed']}")

    sev = _parse_severity(osv_entry)
    return NormalizedVuln(
        id=osv_entry.get("id", "UNKNOWN"),
        summary=osv_entry.get("summary", "No summary available"),
        aliases=aliases,
        severity=sev,
        published=osv_entry.get("published", ""),
        modified=osv_entry.get("modified", ""),
        affected_versions=affected_versions,
        references=osv_entry.get("references", []),
        source="osv",
    )


def _osv_payload(package: Package) -> dict:
    return {
        "package": {"name": package.name, "ecosystem": package.ecosystem if package.ecosystem else "npm"},
        "version": package.version,
    }


def _cache_key(package: Package) -> str:
    eco = package.ecosystem if package.ecosystem else "npm"
    return f"{eco}:{package.name}@{package.version}"


async def _post_osv(client: httpx.AsyncClient, payload: dict) -> dict:
    """POST /query with retry + backoff. Raises OSVUnavailableError on failure."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = await client.post(f"{OSV_API}/query", json=payload, timeout=30)
            if resp.status_code == 404:
                return {"vulns": []}
            resp.raise_for_status()
            try:
                return resp.json()
            except ValueError:
                raise OSVUnavailableError("error", "Invalid OSV response")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY)
                continue
            raise OSVUnavailableError("error", f"API error {e.response.status_code}")
        except httpx.HTTPError:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            raise OSVUnavailableError("offline", "OSV API unreachable")
    raise OSVUnavailableError("error", "Scan failed after retries")


async def _query_batch(client: httpx.AsyncClient, packages: list[Package]) -> list[list | None]:
    """POST /v1/querybatch. Returns one entry per package (None = query failed)."""
    queries = [_osv_payload(p) for p in packages]
    if len(queries) > BATCH_LIMIT:
        raise OSVUnavailableError("error", "Batch size exceeds limit")

    for attempt in range(MAX_RETRIES):
        try:
            resp = await client.post(f"{OSV_API}/querybatch", json={"queries": queries}, timeout=60)
            if resp.status_code in (422, 400):
                # batch unsupported for these inputs — signal per-package fallback
                return [None] * len(packages)
            resp.raise_for_status()
            try:
                raw = resp.json()
            except ValueError:
                raise OSVUnavailableError("error", "Invalid OSV batch response")
            results = raw.get("results", [])
            if len(results) < len(packages):
                raise OSVUnavailableError("error", "OSV batch returned partial results")
            out: list[list | None] = []
            for res in results:
                if res is None:
                    out.append(None)
                else:
                    out.append(res.get("vulns", []))
            return out
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY)
                continue
            raise OSVUnavailableError("error", f"OSV batch API error {e.response.status_code}")
        except httpx.HTTPError:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            raise OSVUnavailableError("offline", "OSV API unreachable")
    raise OSVUnavailableError("error", "OSV batch failed after retries")


async def _build_result(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    package: Package,
    osv_entries: list[dict],
) -> ScanResult:
    osv_vulns = [_parse_osv_entry(entry) for entry in osv_entries]

    cve_ids = []
    for v in osv_vulns:
        found = False
        for alias in v.aliases:
            if alias.startswith("CVE-"):
                cve_ids.append(alias)
                found = True
                break
        if not found and v.id.startswith("CVE-"):
            cve_ids.append(v.id)

    nvd_vulns = await enrich_cves(cve_ids, client=client) if cve_ids else []

    all_vulns = osv_vulns + nvd_vulns
    merged = merge_vulns(all_vulns)

    sources = ["osv"]
    if nvd_vulns:
        sources.append("nvd")

    epss_map: dict[str, dict] = {}
    if merged:
        cve_set = set()
        for v in merged:
            for alias in v.aliases:
                if alias.startswith("CVE-"):
                    cve_set.add(alias)
                    break
            if v.id.startswith("CVE-"):
                cve_set.add(v.id)
        if cve_set:
            epss_map = await enrich_epss(list(cve_set), client=client)

    def _vuln_epss(v: NormalizedVuln) -> dict:
        for alias in v.aliases:
            if alias.startswith("CVE-"):
                info = epss_map.get(alias, {})
                return {"epss_score": info.get("epss_score"), "epss_percentile": info.get("epss_percentile")}
        if v.id.startswith("CVE-"):
            info = epss_map.get(v.id, {})
            return {"epss_score": info.get("epss_score"), "epss_percentile": info.get("epss_percentile")}
        return {"epss_score": None, "epss_percentile": None}

    vulns = [
        Vulnerability(
            id=v.id,
            summary=v.summary,
            aliases=v.aliases,
            severity=v.severity,
            published=v.published,
            modified=v.modified,
            affected_versions=v.affected_versions,
            references=v.references,
            cvss_score=v.cvss_score,
            cvss_vector=v.cvss_vector,
            cwe_id=v.cwe_id,
            source=v.source,
            **_vuln_epss(v),
        )
        for v in merged
    ]

    return ScanResult(package=package, vulnerabilities=vulns, sources_used=sources)


async def query_package(
    client: httpx.AsyncClient, sem: asyncio.Semaphore, package: Package
) -> ScanResult:
    key = _cache_key(package)
    cached = get_cache("osv", key)
    if cached is not None:
        return await _build_result(client, sem, package, cached)

    try:
        async with sem:
            data = await _post_osv(client, _osv_payload(package))
        entries = data.get("vulns", [])
    except OSVUnavailableError as e:
        return ScanResult(package=package, vulnerabilities=[], status=e.status, error=e.message)

    set_cache("osv", key, entries)
    return await _build_result(client, sem, package, entries)


def _create_client() -> httpx.AsyncClient:
    return httpx.AsyncClient()


async def scan(
    packages: list[Package],
    on_result=None,
) -> list[ScanResult]:
    if not packages:
        return []

    sem = asyncio.Semaphore(MAX_CONCURRENT)

    async with _create_client() as client:
        entries_by_idx: dict[int, list[dict]] = {}
        missing: list[int] = []
        for idx, pkg in enumerate(packages):
            hit = get_cache("osv", _cache_key(pkg))
            if hit is not None:
                entries_by_idx[idx] = hit
            else:
                missing.append(idx)

        if missing:
            pkgs_missing = [packages[i] for i in missing]
            collected: list[list[list | None]] = []
            batch_failed = False
            for start in range(0, len(pkgs_missing), BATCH_LIMIT):
                chunk = pkgs_missing[start:start + BATCH_LIMIT]
                try:
                    collected.append(await _query_batch(client, chunk))
                except OSVUnavailableError:
                    batch_failed = True
                    break
            if not batch_failed:
                for offset, res_list in enumerate(collected):
                    base = offset * BATCH_LIMIT
                    for pos, entries in enumerate(res_list):
                        if entries is not None and (base + pos) < len(missing):
                            idx = missing[base + pos]
                            entries_by_idx[idx] = entries
                            set_cache("osv", _cache_key(packages[idx]), entries)

        async def build_one(idx: int) -> ScanResult:
            pkg = packages[idx]
            entries = entries_by_idx.get(idx)
            if entries is None:
                try:
                    async with sem:
                        data = await _post_osv(client, _osv_payload(pkg))
                    entries = data.get("vulns", [])
                except OSVUnavailableError as e:
                    return ScanResult(package=pkg, vulnerabilities=[], status=e.status, error=e.message)
                set_cache("osv", _cache_key(pkg), entries)
            return await _build_result(client, sem, pkg, entries)

        total = len(packages)
        results: list[ScanResult] = [None] * total
        pending = {asyncio.ensure_future(build_one(i)): i for i in range(total)}
        while pending:
            done, _ = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for fut in done:
                idx = pending.pop(fut)
                results[idx] = fut.result()
                if on_result:
                    await on_result(results[idx], idx, total)
        return results