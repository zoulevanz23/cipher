import csv
import io
import json
from datetime import datetime, timezone


def generate_sarif(results: list, summary: dict, project_name: str = "") -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sarif = {
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {"driver": {"name": "vulnchecker", "version": "0.1.0", "informationUri": "https://github.com/bamwinbam-cloud/vulnchecker"}},
                "results": [],
                "properties": {},
            }
        ],
    }

    for r in results:
        vulns = r.get("vulnerabilities", [])
        pkg = r.get("package", {})
        for v in vulns:
            sarif["runs"][0]["results"].append(
                {
                    "ruleId": v.get("id", ""),
                    "level": v.get("severity", "UNKNOWN").lower(),
                    "message": {"text": f"{pkg.get('name', '')}@{pkg.get('version', '')}: {v.get('summary', '')}"},
                    "locations": [
                        {
                            "physicalLocation": {
                                "artifactLocation": {"uri": "package.json"},
                                "region": {"startLine": 1},
                            }
                        }
                    ],
                }
            )

    return json.dumps(sarif, indent=2)


def generate_csv(results: list, summary: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Package", "Version", "Ecosystem", "Vulnerability ID", "Severity", "Summary"])
    for r in results:
        pkg = r.get("package", {})
        vulns = r.get("vulnerabilities", [])
        for v in vulns:
            writer.writerow(
                [
                    pkg.get("name", ""),
                    pkg.get("version", ""),
                    pkg.get("ecosystem", ""),
                    v.get("id", ""),
                    v.get("severity", ""),
                    v.get("summary", ""),
                ]
            )
    return output.getvalue()
