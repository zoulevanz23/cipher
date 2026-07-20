from dataclasses import dataclass, field
from typing import Optional

CVSS_SEVERITY = [
    (9.0, "CRITICAL"),
    (7.0, "HIGH"),
    (4.0, "MEDIUM"),
    (0.1, "LOW"),
]


def cvss_to_severity(score: Optional[float]) -> str:
    if score is None:
        return "UNKNOWN"
    for threshold, label in CVSS_SEVERITY:
        if score >= threshold:
            return label
    return "UNKNOWN"


@dataclass
class NormalizedVuln:
    id: str
    summary: str
    aliases: list[str] = field(default_factory=list)
    severity: str = "UNKNOWN"
    cvss_score: Optional[float] = None
    cvss_vector: str = ""
    cwe_id: str = ""
    published: str = ""
    modified: str = ""
    affected_versions: list[str] = field(default_factory=list)
    references: list[dict] = field(default_factory=list)
    source: str = "osv"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "summary": self.summary,
            "aliases": self.aliases,
            "severity": self.severity,
            "cvss_score": self.cvss_score,
            "cvss_vector": self.cvss_vector,
            "cwe_id": self.cwe_id,
            "published": self.published,
            "modified": self.modified,
            "affected_versions": self.affected_versions,
            "references": self.references,
            "source": self.source,
        }


def merge_vulns(vulns: list[NormalizedVuln]) -> list[NormalizedVuln]:
    groups: dict[str, list[NormalizedVuln]] = {}

    def canon(v: NormalizedVuln) -> str:
        for alias in v.aliases:
            if alias.startswith("CVE-") or alias.startswith("GHSA-"):
                return alias
        if v.id.startswith("CVE-") or v.id.startswith("GHSA-"):
            return v.id
        return v.id

    for v in vulns:
        key = canon(v)
        groups.setdefault(key, []).append(v)

    merged: list[NormalizedVuln] = []
    for key, group in groups.items():
        if len(group) == 1:
            merged.append(group[0])
            continue

        best = group[0]
        for v in group[1:]:
            cvss_a = best.cvss_score if best.cvss_score is not None else -1
            cvss_b = v.cvss_score if v.cvss_score is not None else -1
            if cvss_b > cvss_a:
                best.cvss_score = v.cvss_score
                best.cvss_vector = v.cvss_vector
                best.severity = v.severity

            if len(v.summary) > len(best.summary):
                best.summary = v.summary

            if v.cwe_id and not best.cwe_id:
                best.cwe_id = v.cwe_id

            if v.published and (not best.published or v.published < best.published):
                best.published = v.published

            for ref in v.references:
                if ref not in best.references:
                    best.references.append(ref)

            for a in v.aliases:
                if a not in best.aliases:
                    best.aliases.append(a)

        merged.append(best)

    return merged
