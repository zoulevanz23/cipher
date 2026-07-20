from .scanner import ScanResult

LICENSE_RISK = {
    "": 0,
    "MIT": 0,
    "Apache-2.0": 0,
    "Apache 2.0": 0,
    "BSD": 0,
    "BSD-2-Clause": 0,
    "BSD-3-Clause": 0,
    "ISC": 0,
    "Unlicense": 0,
    "CC0-1.0": 0,
    "LGPL": 10,
    "LGPL-2.1": 10,
    "LGPL-3.0": 10,
    "MPL-2.0": 10,
    "GPL": 20,
    "GPL-2.0": 20,
    "GPL-3.0": 20,
    "AGPL": 25,
    "AGPL-3.0": 25,
    "Unknown": 5,
    "UNKNOWN": 5,
}


def compute_health_score(r: ScanResult) -> int:
    deductions = 0

    vuln_count = len(r.vulnerabilities)
    for v in r.vulnerabilities:
        sev = v.severity.upper()
        if sev == "CRITICAL":
            deductions += 20
        elif sev == "HIGH":
            deductions += 10
        elif sev == "MEDIUM":
            deductions += 5
        elif sev == "LOW":
            deductions += 2

    if r.unmaintained:
        deductions += 15

    lic = (r.package.license or "").upper()
    deductions += LICENSE_RISK.get(lic, 5)

    score = max(0, min(100, 100 - deductions))
    return score


def health_grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 75:
        return "B"
    if score >= 50:
        return "C"
    if score >= 25:
        return "D"
    return "F"
