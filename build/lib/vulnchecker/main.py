import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from .parser import parse_dependencies, Package
from .scanner import scan, ScanResult
from .detector import detect_ecosystems, find_manifest_files
from .parsers import parse_ecosystem
from .report import generate_html_report
from .fixer import compute_fixes, generate_fixed_package_json
from .license import fetch_package_info, is_unmaintained
from .safety import classify_upgrade, upgrade_risk_label
from .health import compute_health_score, health_grade
from .sbom import generate_spdx, generate_cyclonedx
from .export import generate_sarif, generate_csv
from .config import should_ignore
from .history import save_scan, get_history
from .news import fetch_news

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
    package_json: Optional[str] = None
    lock_file: Optional[str] = None
    lock_file_type: Optional[str] = "package-lock.json"
    min_severity: Optional[str] = "low"
    ecosystem: Optional[str] = "npm"
    ignore: list[str] = []
    ignore_until: dict[str, str] = {}


class ScanResponse(BaseModel):
    summary: dict
    results: list
    fixes: list = []
    sources_used: list[str] = []


SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/api/scan", response_model=ScanResponse)
async def scan_endpoint(req: ScanRequest):
    ecosystem = req.ecosystem or "npm"

    if ecosystem == "npm":
        try:
            packages = parse_dependencies(
                package_json_str=req.package_json,
                lock_file_str=req.lock_file,
                lock_file_type=req.lock_file_type or "package-lock.json",
            )
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format")
    else:
        if req.package_json:
            try:
                manifest = json.loads(req.package_json)
                raw = json.dumps(manifest)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON format")
            packages = parse_ecosystem(ecosystem, [("package.json", raw)])
        else:
            raise HTTPException(status_code=400, detail=f"package_json required for ecosystem '{ecosystem}'")

    if not packages:
        raise HTTPException(status_code=400, detail="No dependencies found")

    min_sev = SEVERITY_ORDER.get(req.min_severity or "low", 1)

    scan_results = await scan(packages)

    filtered: list[ScanResult] = []
    for r in scan_results:
        r.vulnerabilities = [
            v
            for v in r.vulnerabilities
            if SEVERITY_ORDER.get(v.severity.lower(), 0) >= min_sev and not should_ignore(v.id, {"ignore": req.ignore, "ignore_until": req.ignore_until})
        ]
        filtered.append(r)

    vulnerable_count = sum(1 for r in filtered if r.vulnerabilities)
    total_vulns = sum(len(r.vulnerabilities) for r in filtered)

    pkg_infos = await fetch_package_info(packages)
    for r in filtered:
        info = pkg_infos.get(r.package.name, {})
        r.package.license = info.get("license", "")
        r.unmaintained = is_unmaintained(info.get("last_updated", ""))
        r.health_score = compute_health_score(r)

    all_sources: set[str] = set()
    results_data = []
    for r in filtered:
        all_sources.update(r.sources_used)
        results_data.append({
            "package": {
                "name": r.package.name,
                "version": r.package.version,
                "type": r.package.type,
                "ecosystem": r.package.ecosystem if hasattr(r.package, 'ecosystem') else ecosystem,
                "license": r.package.license,
                "dependencies": [{"name": d.name, "version": d.version} for d in (r.package.dependencies or [])] if r.package.dependencies else [],
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
                    "cvss_score": v.cvss_score,
                    "cvss_vector": v.cvss_vector,
                    "cwe_id": v.cwe_id,
                    "source": v.source,
                }
                for v in r.vulnerabilities
            ],
            "max_severity": r.max_severity,
            "vulnerable": len(r.vulnerabilities) > 0,
            "unmaintained": r.unmaintained,
            "health_score": r.health_score,
        })

    fixes = await compute_fixes(filtered) if req.package_json else []

    for f in fixes:
        risk = classify_upgrade(f["current_version"], f["recommended_version"])
        f["risk"] = risk
        f["risk_label"] = upgrade_risk_label(risk)

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
        fixes=fixes,
        sources_used=sorted(all_sources),
    )



class ReportRequest(BaseModel):
    results: list
    summary: dict
    project_name: str = ""
    fixes: list = []


@app.post("/api/scan/report")
async def scan_report(req: ReportRequest):
    html = generate_html_report(req.results, req.summary, req.project_name, req.fixes)
    return HTMLResponse(content=html, media_type="text/html")



class FixPackageJsonRequest(BaseModel):
    package_json: str
    fixes: list


@app.post("/api/scan/fix")
async def fix_package_json(req: FixPackageJsonRequest):
    try:
        fixed = generate_fixed_package_json(req.package_json, req.fixes)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to generate fixed package.json")
    return JSONResponse(content={"fixed_package_json": fixed})


class ExportRequest(BaseModel):
    results: list
    summary: dict
    project_name: str = ""
    format: str = "spdx"


@app.post("/api/scan/export")
async def export_scan(req: ExportRequest):
    fmt = req.format.lower()
    if fmt == "spdx":
        content = generate_spdx(req.results, req.summary, req.project_name)
    elif fmt == "cyclonedx":
        content = generate_cyclonedx(req.results, req.summary, req.project_name)
    elif fmt == "sarif":
        content = generate_sarif(req.results, req.summary, req.project_name)
    elif fmt == "csv":
        content = generate_csv(req.results, req.summary)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {fmt}")
    return JSONResponse(content={"content": content, "format": fmt})


class SaveScanRequest(BaseModel):
    results: list
    summary: dict
    fixes: list = []
    project_name: str = ""


@app.post("/api/scan/save")
async def save_scan_endpoint(req: SaveScanRequest):
    scan_id = save_scan(req.summary, req.results, req.fixes, req.project_name)
    return {"scan_id": scan_id}


@app.get("/api/scan/history")
async def scan_history(limit: int = 20):
    return get_history(limit)


@app.get("/api/news")
async def news_feed(limit: int = 5):
    items = await fetch_news(limit)
    return items


@app.post("/api/scan/file")
async def scan_file():
    raise HTTPException(status_code=501, detail="File upload endpoint not implemented yet")
