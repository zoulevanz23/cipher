import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from .parser import parse_dependencies, Package
from .scanner import scan, ScanResult

app = FastAPI(
    title="VulnChecker API",
    description="Vulnerability dependency checker using OSV API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    package_json: str
    lock_file: Optional[str] = None
    lock_file_type: Optional[str] = "package-lock.json"
    min_severity: Optional[str] = "low"


class ScanResponse(BaseModel):
    summary: dict
    results: list


SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/api/scan", response_model=ScanResponse)
async def scan_endpoint(req: ScanRequest):
    try:
        packages = parse_dependencies(
            package_json_str=req.package_json,
            lock_file_str=req.lock_file,
            lock_file_type=req.lock_file_type or "package-lock.json",
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format in package.json")

    if not packages:
        raise HTTPException(status_code=400, detail="No dependencies found")

    min_sev = SEVERITY_ORDER.get(req.min_severity or "low", 1)

    scan_results = await scan(packages)

    filtered: list[ScanResult] = []
    for r in scan_results:
        r.vulnerabilities = [
            v
            for v in r.vulnerabilities
            if SEVERITY_ORDER.get(v.severity.lower(), 0) >= min_sev
        ]
        filtered.append(r)

    vulnerable_count = sum(1 for r in filtered if r.vulnerabilities)
    total_vulns = sum(len(r.vulnerabilities) for r in filtered)

    results_data = [
        {
            "package": {
                "name": r.package.name,
                "version": r.package.version,
                "type": r.package.type,
            },
            "vulnerabilities": [
                {
                    "id": v.id,
                    "summary": v.summary,
                    "aliases": v.aliases,
                    "severity": v.severity,
                    "published": v.published,
                    "affected_versions": v.affected_versions,
                    "references": v.references,
                }
                for v in r.vulnerabilities
            ],
            "max_severity": r.max_severity,
            "vulnerable": len(r.vulnerabilities) > 0,
        }
        for r in filtered
    ]

    return ScanResponse(
        summary={
            "total_packages": len(filtered),
            "vulnerable_packages": vulnerable_count,
            "total_vulnerabilities": total_vulns,
            "severity_breakdown": {
                "critical": sum(1 for r in filtered for v in r.vulnerabilities if v.severity == "CRITICAL"),
                "high": sum(1 for r in filtered for v in r.vulnerabilities if v.severity == "HIGH"),
                "medium": sum(1 for r in filtered for v in r.vulnerabilities if v.severity == "MEDIUM"),
                "low": sum(1 for r in filtered for v in r.vulnerabilities if v.severity == "LOW"),
            },
        },
        results=results_data,
    )


@app.post("/api/scan/file")
async def scan_file():
    raise HTTPException(status_code=501, detail="File upload endpoint not implemented yet")
