import pytest
from vulnchecker.normalize import normalize_vulnerability

def test_normalize_vulnerability():
    vuln = {
        "id": "CVE-2021-1234",
        "summary": "Test vulnerability",
        "severity": "HIGH",
        "affected": [{"package": {"name": "test", "ecosystem": "npm"}}]
    }
    
    normalized = normalize_vulnerability(vuln)
    assert normalized.id == "CVE-2021-1234"
    assert normalized.severity == "HIGH"
