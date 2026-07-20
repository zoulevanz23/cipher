import json
from datetime import datetime, timezone


def generate_spdx(results: list, summary: dict, project_name: str = "") -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    spdx_doc = {
        "spdxVersion": "SPDX-2.3",
        "dataLicense": "CC0-1.0",
        "SPDXID": "SPDXRef-DOCUMENT",
        "name": f"{project_name or 'VulnChecker-Scan'} {now}",
        "creationInfo": {
            "created": now,
            "creators": ["Tool: vulnchecker-0.1.0"],
        },
        "packages": [],
        "relationships": [],
    }

    for i, r in enumerate(results):
        pkg = r.get("package", {})
        vulns = r.get("vulnerabilities", [])
        spdx_pkg = {
            "SPDXID": f"SPDXRef-Package-{i}",
            "name": pkg.get("name", "unknown"),
            "versionInfo": pkg.get("version", ""),
            "licenseConcluded": pkg.get("license", "NOASSERTION"),
            "licenseDeclared": pkg.get("license", "NOASSERTION"),
            "supplier": "NOASSERTION",
            "downloadLocation": "NOASSERTION",
        }
        spdx_doc["packages"].append(spdx_pkg)

        for v in vulns:
            rel = {
                "spdxElementId": f"SPDXRef-Package-{i}",
                "relatedSpdxElement": f"SPDXRef-Vulnerability-{v.get('id', 'unknown')}",
                "relationshipType": "HAS_VULNERABILITY",
            }
            spdx_doc["relationships"].append(rel)

    return json.dumps(spdx_doc, indent=2)


def generate_cyclonedx(results: list, summary: dict, project_name: str = "") -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cd = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "version": 1,
        "metadata": {
            "timestamp": now,
            "tools": [{"name": "vulnchecker", "version": "0.1.0"}],
        },
        "components": [],
        "vulnerabilities": [],
    }

    for i, r in enumerate(results):
        pkg = r.get("package", {})
        vulns = r.get("vulnerabilities", [])
        purl = f"pkg:{pkg.get('ecosystem', 'npm')}/{pkg.get('name', 'unknown')}@{pkg.get('version', '')}"
        comp = {
            "bom-ref": f"pkg-{i}",
            "type": "library",
            "name": pkg.get("name", "unknown"),
            "version": pkg.get("version", ""),
            "purl": purl,
        }
        if pkg.get("license"):
            comp["licenses"] = [{"license": {"name": pkg["license"]}}]
        cd["components"].append(comp)

        for v in vulns:
            vuln_entry = {
                "bom-ref": f"vuln-{v.get('id', 'unknown')}",
                "id": v.get("id", ""),
                "description": v.get("summary", ""),
                "ratings": [{"severity": v.get("severity", "UNKNOWN").lower()}],
            }
            cd["vulnerabilities"].append(vuln_entry)

    return json.dumps(cd, indent=2)
