import asyncio
from dataclasses import dataclass, field

import httpx

from .parser import Package
from .normalize import NormalizedVuln, merge_vulns, cvss_to_severity
from .scanners.nvd import enrich_cves

OSV_API = "https://api.osv.dev/v1"
RETRY_DELAY = 1.0
MAX_RETRIES = 3
MAX_CONCURRENT = 20


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


@dataclass
class ScanResult:
    package: Package
    vulnerabilities: list[Vulnerability] = field(default_factory=list)
    unmaintained: bool = False
    health_score: int = 100
    sources_used: list[str] = field(default_factory=lambda: ["osv"])

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


async def query_package(
    client: httpx.AsyncClient, sem: asyncio.Semaphore, package: Package
) -> ScanResult:
    eco = package.ecosystem if package.ecosystem else "npm"
    query = {
        "package": {"name": package.name, "ecosystem": eco},
        "version": package.version,
    }

    for attempt in range(MAX_RETRIES):
        try:
            async with sem:
                resp = await client.post(f"{OSV_API}/query", json=query, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            osv_vulns = [_parse_osv_entry(entry) for entry in data.get("vulns", [])]

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

            nvd_vulns = await enrich_cves(cve_ids)

            all_vulns = osv_vulns + nvd_vulns
            merged = merge_vulns(all_vulns)

            sources = ["osv"]
            if nvd_vulns:
                sources.append("nvd")

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
                )
                for v in merged
            ]

            return ScanResult(package=package, vulnerabilities=vulns, sources_used=sources)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY)
                continue
            return ScanResult(package=package, vulnerabilities=[])
        except httpx.RequestError:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return ScanResult(package=package, vulnerabilities=[])


async def scan(packages: list[Package]) -> list[ScanResult]:
    if not packages:
        return []

    sem = asyncio.Semaphore(MAX_CONCURRENT)

    async with httpx.AsyncClient() as client:
        tasks = [query_package(client, sem, pkg) for pkg in packages]
        return await asyncio.gather(*tasks)
