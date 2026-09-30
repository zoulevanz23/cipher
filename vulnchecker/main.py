import json
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
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
from .history import save_scan, get_history, get_scan as get_scan_db, get_scan_stats
from .account import (
    create_user,
    create_anonymous,
    get_user_by_email,
    generate_token,
    verify_token,
    generate_login_token,
    check_and_consume_credits,
    get_credits_status,
    get_user,
    validate_email,
    validate_password,
    check_rate_limit,
    change_password,
    delete_user,
    get_or_create_oauth_user,
    google_client_id,
    verify_google_id_token,
)
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

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}
CREDITS_LIMIT = 23


class ScanRequest(BaseModel):
    package_json: Optional[str] = None
    lock_file: Optional[str] = None
    lock_file_type: Optional[str] = "package-lock.json"
    min_severity: Optional[str] = "low"
    ecosystem: Optional[str] = "npm"
    include_dev: bool = True
    ignore: list[str] = []
    ignore_until: dict[str, str] = {}
    # extended — all optional for backward compat
    policies: Optional[dict] = None
    license_policy: Optional[dict] = None
    source_files: Optional[list[dict]] = None
    registry_auth: Optional[dict] = None
    only_reachable: bool = False


class ScanUrlRequest(BaseModel):
    url: str
    filename: Optional[str] = None
    min_severity: Optional[str] = "low"
    ecosystem: Optional[str] = None
    include_dev: bool = True
    ignore: list[str] = []
    ignore_until: dict[str, str] = {}


class ScanResponse(BaseModel):
    summary: dict
    results: list
    fixes: list = []
    sources_used: list[str] = []
    anonymous_credits_remaining: int = 0
    scan_status: str = "ok"
    scan_errors: list = []
    policy: Optional[dict] = None
    sbom_diff: Optional[dict] = None
    license_policy: Optional[dict] = None


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class ReportRequest(BaseModel):
    results: list
    summary: dict
    project_name: str = ""
    fixes: list = []


class FixPackageJsonRequest(BaseModel):
    package_json: str
    fixes: list


class ExportRequest(BaseModel):
    results: list
    summary: dict
    project_name: str = ""
    format: str = "spdx"


class SaveScanRequest(BaseModel):
    results: list
    summary: dict
    fixes: list = []
    project_name: str = ""


class PasswordRequest(BaseModel):
    current_password: str
    new_password: str


class CreditsStatusResponse(BaseModel):
    credits: int
    reset_in_hours: float
    is_authenticated: bool


def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)
    if not user_id:
        return None
    user = get_user(user_id)
    return user


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/api/auth/register")
async def register(req: RegisterRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"reg:{ip}", 5, 3600):
        raise HTTPException(status_code=429, detail="Too many registration attempts. Try again later.", headers={"Retry-After": "3600"})
    email = req.email.strip().lower()
    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email")
    pw_err = validate_password(req.password, email)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="Email already registered")
    try:
        user_id = create_user(email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    token = generate_token(user_id)
    return {"user_id": user_id, "token": token, "email": email}


@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    email = req.email.strip().lower()
    if not check_rate_limit(f"login:{ip}:{email}", 5, 900):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 15 minutes.", headers={"Retry-After": "900"})
    token = generate_login_token(email, req.password)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = get_user_by_email(email)
    return {"token": token, "user_id": user["id"], "email": user["email"]}


@app.post("/api/auth/anonymous")
async def anonymous_login(request: Request):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"anon:{ip}", 10, 3600):
        raise HTTPException(status_code=429, detail="Too many anonymous accounts. Try again later.", headers={"Retry-After": "3600"})
    user_id = create_anonymous()
    token = generate_token(user_id)
    credits = get_credits_status(user_id)
    return {"token": token, "user_id": user_id, "is_anonymous": True, "is_new": True, **credits}


@app.post("/api/auth/google")
async def google_login(req: GoogleAuthRequest, request: Request):
    """Google Identity Services sign-in. Verifies the ID token, then
    finds-or-creates the account (first Google sign-in auto-creates it)."""
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"google:{ip}", 10, 3600):
        raise HTTPException(status_code=429, detail="Too many Google sign-in attempts. Try again later.", headers={"Retry-After": "3600"})
    client_id = google_client_id()
    if not client_id:
        raise HTTPException(status_code=500, detail="Google sign-in is not configured on this server.")
    info = verify_google_id_token(req.id_token, client_id)
    if not info:
        raise HTTPException(status_code=401, detail="Invalid Google credential.")
    email = (info.get("email") or "").strip().lower()
    if not info.get("email_verified") or not validate_email(email):
        raise HTTPException(status_code=401, detail="Google account email is not verified.")
    sub = info.get("sub") or ""
    user_id, is_new = get_or_create_oauth_user(email, "google", sub)
    token = generate_token(user_id)
    return {"token": token, "user_id": user_id, "email": email, "is_anonymous": False, "is_new": is_new}


@app.get("/api/auth/me")
async def me(user: Optional[dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    stats = get_scan_stats(user["id"])
    return {
        "user_id": user["id"],
        "email": user["email"],
        "is_anonymous": bool(user["is_anonymous"]),
        "created_at": user.get("created_at"),
        "credits": get_credits_status(user["id"]),
        "stats": {
            "scan_count": stats.get("count", 0) or 0,
            "total_vulnerabilities": stats.get("total_vulns", 0) or 0,
        },
    }


@app.get("/api/auth/credits")
async def credits(user: Optional[dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"credits": get_credits_status(user["id"]), "is_authenticated": not user["is_anonymous"]}


@app.post("/api/auth/password")
async def change_password_endpoint(req: PasswordRequest, user: Optional[dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    ok, msg = change_password(user["id"], req.current_password, req.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"detail": msg}


@app.delete("/api/auth/account")
async def delete_account(user: Optional[dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.get("is_anonymous"):
        raise HTTPException(status_code=400, detail="Anonymous accounts cannot be deleted")
    delete_user(user["id"])
    return {"detail": "Account deleted"}


def require_auth(user: Optional[dict] = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def _compose_scan_response(
    packages: list[Package],
    scan_results: list[ScanResult],
    *,
    ecosystem: str,
    min_severity: str,
    ignore: list[str],
    ignore_until: dict[str, str],
    has_manifest: bool,
    is_anonymous: bool,
    user_id: Optional[int],
    # extended optional
    policies: Optional[dict] = None,
    license_policy: Optional[dict] = None,
    registry_auth: Optional[dict] = None,
    source_files: Optional[list[dict]] = None,
    only_reachable: bool = False,
) -> ScanResponse:
    min_sev = SEVERITY_ORDER.get(min_severity or "low", 1)

    filtered: list[ScanResult] = []
    for r in scan_results:
        r.vulnerabilities = [
            v
            for v in r.vulnerabilities
            if SEVERITY_ORDER.get(v.severity.lower(), 0) >= min_sev
            and not should_ignore(v.id, {"ignore": ignore, "ignore_until": ignore_until})
        ]
        filtered.append(r)

    vulnerable_count = sum(1 for r in filtered if r.vulnerabilities)
    total_vulns = sum(len(r.vulnerabilities) for r in filtered)

    pkg_infos = await fetch_package_info(packages, registry_auth=registry_auth)
    for r in filtered:
        info = pkg_infos.get(r.package.name, {})
        r.package.license = info.get("license", "")
        r.unmaintained = is_unmaintained(info.get("last_updated", ""))
        r.health_score = compute_health_score(r)

    # --- reachability: annotate each result ---
    if source_files:
        try:
            from .reachability import analyze_reachability

            reach_map = analyze_reachability(packages, source_files, ecosystem)
            for r in filtered:
                setattr(r, "reachable", reach_map.get(r.package.name, "unknown"))
                if only_reachable and getattr(r, "reachable", "unknown") == "unreachable":
                    r.vulnerabilities = []
        except Exception:
            pass
    # also annotate reachable even without source_files for UI hint
    for r in filtered:
        if not hasattr(r, "reachable"):
            setattr(r, "reachable", "unknown")

    # --- license policy denylist enforcement (health already penalizes, this counts violations) ---
    lic_denylist = []
    lic_allowlist = None
    if license_policy:
        lic_denylist = [x.upper() for x in license_policy.get("denylist", [])]
        lic_allowlist = license_policy.get("allowlist")
        if lic_allowlist:
            lic_allowlist = [x.upper() for x in lic_allowlist]

    all_sources: set[str] = set()
    results_data = []
    scan_errors = []
    for r in filtered:
        if r.status != "ok":
            scan_errors.append({
                "package": r.package.name,
                "version": r.package.version,
                "status": r.status,
                "error": r.error,
            })
        all_sources.update(r.sources_used)
        results_data.append({
            "package": {
                "name": r.package.name,
                "version": r.package.version,
                "type": r.package.type,
                "ecosystem": r.package.ecosystem if hasattr(r.package, "ecosystem") else ecosystem,
                "license": r.package.license,
                "dependencies": [{"name": d.name, "version": d.version} for d in (r.package.dependencies or [])]
                if r.package.dependencies
                else [],
            },
            "status": r.status,
            "scan_error": r.error,
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
                    "epss_score": v.epss_score,
                    "epss_percentile": v.epss_percentile,
                }
                for v in r.vulnerabilities
            ],
            "max_severity": r.max_severity,
            "vulnerable": len(r.vulnerabilities) > 0,
            "unmaintained": r.unmaintained,
            "health_score": r.health_score,
            "reachable": getattr(r, "reachable", "unknown"),
            "license_violation": getattr(r, "license_violation", False),
        })

    fixes = await compute_fixes(filtered, registry_auth=registry_auth) if has_manifest else []

    # attach transitive path for override guidance
    try:
        from .reachability import dependency_paths

        paths = dependency_paths(packages)
        for f in fixes:
            f["path"] = paths.get(f["package_name"], [])
            # override snippet per ecosystem
            eco = f.get("ecosystem", "npm")
            ver = f.get("recommended_version", "")
            name = f["package_name"]
            if eco == "npm":
                f["override_snippet"] = f'\"overrides\": {{\"{name}\": \"{ver}\"}}'
            elif eco == "pypi":
                f["override_snippet"] = f"{name}=={ver}"
            elif eco == "go":
                f["override_snippet"] = f"replace {name} => {name} {ver}"
            elif eco == "maven":
                f["override_snippet"] = f"<version>{ver}</version>"
            else:
                f["override_snippet"] = f"{name}@{ver}"
            # is transitive?
            f["is_transitive"] = len(f["path"]) > 1
    except Exception:
        pass

    for f in fixes:
        risk = classify_upgrade(f["current_version"], f["recommended_version"])
        f["risk"] = risk
        f["risk_label"] = upgrade_risk_label(risk)

    # license violations count for policy
    lic_violations = 0
    for r in filtered:
        lic = (r.package.license or "").upper()
        if lic_denylist and lic in lic_denylist:
            lic_violations += 1
        elif lic_allowlist is not None and lic not in [x.upper() for x in lic_allowlist] and lic:
            lic_violations += 1
        r.license_violation = lic in lic_denylist if lic_denylist else False

    credits_remaining = 0
    if is_anonymous and user_id:
        credits_remaining = get_credits_status(user_id)["credits"]

    # policy evaluation
    health_avg = None
    if filtered:
        scores = [r.health_score for r in filtered if isinstance(r.health_score, int)]
        if scores:
            health_avg = round(sum(scores) / len(scores))
    try:
        from .policy import evaluate_policy

        policy_result = evaluate_policy(
            {
                "total_packages": len(filtered),
                "vulnerable_packages": sum(1 for r in filtered if r.vulnerabilities),
                "total_vulnerabilities": sum(len(r.vulnerabilities) for r in filtered),
                "severity_breakdown": {
                    "critical": sum(1 for r in filtered for v in r.vulnerabilities if v.severity == "CRITICAL"),
                    "high": sum(1 for r in filtered for v in r.vulnerabilities if v.severity == "HIGH"),
                    "medium": sum(1 for r in filtered for v in r.vulnerabilities if v.severity == "MEDIUM"),
                    "low": sum(1 for r in filtered for v in r.vulnerabilities if v.severity == "LOW"),
                },
            },
            health_avg,
            license_violations=lic_violations,
            config={"policies": policies, "license_denylist": lic_denylist} if policies else {"policies": policies or {}},
        )
    except Exception:
        policy_result = {"pass": True, "violations": [], "policy": {}}

    # also tag results with reachable and license_violation for frontend


    statuses = {r.status for r in filtered}
    if statuses == {"ok"}:
        scan_status = "ok"
    elif "ok" in statuses:
        scan_status = "partial"
    elif statuses <= {"offline", "error"}:
        scan_status = "offline" if "offline" in statuses else "error"
    else:
        scan_status = "error"

    # license violation count for policy already computed
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
        anonymous_credits_remaining=credits_remaining,
        scan_status=scan_status,
        scan_errors=scan_errors,
        policy=policy_result,
        license_policy={"denylist": lic_denylist, "allowlist": lic_allowlist},
    )


async def _build_scan_response(
    packages: list[Package],
    *,
    ecosystem: str,
    min_severity: str,
    ignore: list[str],
    ignore_until: dict[str, str],
    has_manifest: bool,
    is_anonymous: bool,
    user_id: Optional[int],
    policies: Optional[dict] = None,
    license_policy: Optional[dict] = None,
    registry_auth: Optional[dict] = None,
    source_files: Optional[list[dict]] = None,
    only_reachable: bool = False,
) -> ScanResponse:
    scan_results = await scan(packages)
    return await _compose_scan_response(
        packages,
        scan_results,
        ecosystem=ecosystem,
        min_severity=min_severity,
        ignore=ignore,
        ignore_until=ignore_until,
        has_manifest=has_manifest,
        is_anonymous=is_anonymous,
        user_id=user_id,
        policies=policies,
        license_policy=license_policy,
        registry_auth=registry_auth,
        source_files=source_files,
        only_reachable=only_reachable,
    )


def _enforce_scan_credits(is_anonymous: bool, user_id: Optional[int], request: Request) -> None:
    if not is_anonymous:
        return
    if user_id is None:
        ip = request.client.host if request.client else "unknown"
        check_rate_limit(f"scan:anon:{ip}", 20, 3600)
        raise HTTPException(
            status_code=429,
            detail="Scan limit reached. Create an account for unlimited scans. Credits remaining: 0",
        )
    allowed, _ = check_and_consume_credits(user_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Scan limit reached. Create an account for unlimited scans. Credits remaining: 0",
        )


def _filter_dev_dependencies(packages: list[Package], include_dev: bool) -> list[Package]:
    if include_dev:
        return packages
    return [p for p in packages if p.type != "devDependency"]


@app.post("/api/scan", response_model=ScanResponse)
async def scan_endpoint(req: ScanRequest, request: Request, user: Optional[dict] = Depends(get_current_user)):
    is_anonymous = user is None or user.get("is_anonymous")
    user_id = user["id"] if user else None
    _enforce_scan_credits(is_anonymous, user_id, request)

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

    packages = _filter_dev_dependencies(packages, req.include_dev)
    if not packages:
        raise HTTPException(status_code=400, detail="No dependencies found")

    return await _build_scan_response(
        packages,
        ecosystem=ecosystem,
        min_severity=req.min_severity or "low",
        ignore=req.ignore,
        ignore_until=req.ignore_until,
        has_manifest=bool(req.package_json),
        is_anonymous=is_anonymous,
        user_id=user_id,
        policies=req.policies,
        license_policy=req.license_policy,
        registry_auth=req.registry_auth,
        source_files=req.source_files,
        only_reachable=req.only_reachable,
    )


ALLOWED_MANIFESTS = {
    "package.json": ("npm", "manifest"),
    "package-lock.json": ("npm", "lock"),
    "yarn.lock": ("npm", "lock"),
    "pnpm-lock.yaml": ("pnpm", "lock"),
    "requirements.txt": ("pypi", "manifest"),
    "Pipfile": ("pypi", "manifest"),
    "Pipfile.lock": ("pypi", "lock"),
    "pyproject.toml": ("pypi", "manifest"),
    "go.mod": ("go", "manifest"),
    "Cargo.toml": ("cargo", "manifest"),
    "Gemfile.lock": ("rubygems", "lock"),
    "pom.xml": ("maven", "manifest"),
    "packages.config": ("nuget", "manifest"),
    "*.csproj": ("nuget", "manifest"),
}


def _filename_from_url(url: str) -> str:
    path = url.split("?", 1)[0].split("#", 1)[0].rstrip("/")
    return path.rsplit("/", 1)[-1] if "/" in path else path


@app.post("/api/scan/url", response_model=ScanResponse)
async def scan_url_endpoint(req: ScanUrlRequest, request: Request, user: Optional[dict] = Depends(get_current_user)):
    is_anonymous = user is None or user.get("is_anonymous")
    user_id = user["id"] if user else None
    _enforce_scan_credits(is_anonymous, user_id, request)

    try:
        from urllib.parse import urlparse
        parsed = urlparse(req.url)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL")
    if parsed.scheme != "https":
        raise HTTPException(status_code=400, detail="Only https URLs are supported")

    filename = req.filename or _filename_from_url(req.url)
    kind = ALLOWED_MANIFESTS.get(filename)
    if kind is None and filename.endswith(".csproj"):
        kind = ALLOWED_MANIFESTS["*.csproj"]
    if kind is None:
        raise HTTPException(status_code=400, detail=f"Unsupported manifest '{filename}'")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
            resp = await client.get(req.url)
            resp.raise_for_status()
            content = resp.text
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="Could not fetch URL (bad status)")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not fetch URL")

    if len(content.encode("utf-8")) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Manifest too large")

    ecosystem, file_kind = kind
    if req.ecosystem:
        ecosystem = req.ecosystem

    try:
        if ecosystem == "npm":
            if file_kind == "lock":
                lock_type = filename if filename in ("package-lock.json", "yarn.lock") else "package-lock.json"
                packages = parse_dependencies(lock_file_str=content, lock_file_type=lock_type)
            else:
                packages = parse_dependencies(package_json_str=content)
        else:
            packages = parse_ecosystem(ecosystem, [(filename, content)])
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid manifest content")

    packages = _filter_dev_dependencies(packages, req.include_dev)
    if not packages:
        raise HTTPException(status_code=400, detail="No dependencies found")

    return await _build_scan_response(
        packages,
        ecosystem=ecosystem,
        min_severity=req.min_severity or "low",
        ignore=req.ignore,
        ignore_until=req.ignore_until,
        has_manifest=file_kind == "manifest",
        is_anonymous=is_anonymous,
        user_id=user_id,
    )


@app.post("/api/scan/stream")
async def scan_stream_endpoint(req: ScanRequest, request: Request, user: Optional[dict] = Depends(get_current_user)):
    is_anonymous = user is None or user.get("is_anonymous")
    user_id = user["id"] if user else None
    _enforce_scan_credits(is_anonymous, user_id, request)

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
                raw = json.loads(req.package_json)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON format")
            packages = parse_ecosystem(ecosystem, [("package.json", json.dumps(raw))])
        else:
            raise HTTPException(status_code=400, detail=f"package_json required for ecosystem '{ecosystem}'")

    packages = _filter_dev_dependencies(packages, req.include_dev)
    if not packages:
        raise HTTPException(status_code=400, detail="No dependencies found")

    total = len(packages)

    async def event_stream():
        import asyncio
        from asyncio.queues import Queue

        q: Queue = Queue()

        async def on_result(result: ScanResult, idx: int, n: int):
            await q.put({
                "event": "progress",
                "index": idx,
                "total": n,
                "package": result.package.name,
                "version": result.package.version,
                "status": result.status,
                "vulnerabilities": len(result.vulnerabilities),
            })

        def sse(payload: dict) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        task = asyncio.create_task(scan(packages, on_result=on_result))
        try:
            yield sse({"event": "started", "total": total})
            for _ in range(total):
                item = await asyncio.wait_for(q.get(), timeout=120)
                yield sse(item)
            results = await task
        except asyncio.TimeoutError:
            task.cancel()
            yield sse({"event": "error", "detail": "Scan timed out"})
            return

        response = await _compose_scan_response(
            packages,
            results,
            ecosystem=ecosystem,
            min_severity=req.min_severity or "low",
            ignore=req.ignore,
            ignore_until=req.ignore_until,
            has_manifest=bool(req.package_json),
            is_anonymous=is_anonymous,
            user_id=user_id,
        )
        yield sse({"event": "done", "scan": response.model_dump()})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/scan/save")
async def save_scan_endpoint(req: SaveScanRequest, user: Optional[dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    scan_id = save_scan(user["id"], req.summary, req.results, req.fixes, req.project_name)
    return {"scan_id": scan_id}


@app.get("/api/scan/history")
async def scan_history(limit: int = 20, user: Optional[dict] = Depends(get_current_user)):
    user_id = user["id"] if user else None
    return get_history(user_id, limit)


@app.get("/api/scan/history/{scan_id}")
async def scan_history_entry(scan_id: int, user: Optional[dict] = Depends(get_current_user)):
    """Fetch one saved scan — always scoped to the caller, so users can
    only ever reopen their own history entries."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    entry = get_scan_db(scan_id, user["id"])
    if not entry:
        raise HTTPException(status_code=404, detail="Scan not found")
    return entry


@app.get("/api/news")
async def news_feed(limit: int = 5):
    items = await fetch_news(limit)
    return items


@app.post("/api/scan/report")
async def scan_report(req: ReportRequest):
    html = generate_html_report(req.results, req.summary, req.project_name, req.fixes)
    return HTMLResponse(content=html, media_type="text/html")


@app.post("/api/scan/fix")
async def fix_package_json(req: FixPackageJsonRequest):
    try:
        fixed = generate_fixed_package_json(req.package_json, req.fixes)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to generate fixed package.json")
    return JSONResponse(content={"fixed_package_json": fixed})


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


@app.post("/api/scan/diff")
async def scan_diff(payload: dict):
    """SBOM diff: expects {prev: {results,summary}, cur: {results,summary}} or {prev_id, cur_id}."""
    try:
        from .sbom_diff import diff_sbom

        prev = payload.get("prev")
        cur = payload.get("cur")
        # support scan history ids
        if not prev and payload.get("prev_id"):
            entry = get_scan_db(payload["prev_id"], 0)  # try anonymous? fallback
            if entry:
                prev = {"results": json.loads(entry.get("results_json") or "[]"), "summary": {}}
        if not cur and payload.get("cur_id"):
            entry = get_scan_db(payload["cur_id"], 0)
            if entry:
                cur = {"results": json.loads(entry.get("results_json") or "[]"), "summary": {}}
        if not prev or not cur:
            raise HTTPException(status_code=400, detail="prev and cur required")
        prev_results = prev.get("results") if isinstance(prev, dict) else prev
        cur_results = cur.get("results") if isinstance(cur, dict) else cur
        if not isinstance(prev_results, list):
            prev_results = prev.get("results", [])
        if not isinstance(cur_results, list):
            cur_results = cur.get("results", [])
        diff = diff_sbom(prev_results, cur_results)
        # changelog text
        lines = []
        if diff["added"]:
            lines.append(f"+{len(diff['added'])} added: {', '.join(diff['added'][:5])}")
        if diff["removed"]:
            lines.append(f"-{len(diff['removed'])} removed: {', '.join(diff['removed'][:5])}")
        for u in diff["upgraded"][:5]:
            fixed = f" fixes {','.join(u['fixed'])}" if u["fixed"] else ""
            lines.append(f"{u['package']} {u['from']}→{u['to']}{fixed}")
        diff["changelog"] = "\n".join(lines) if lines else "No changes"
        return diff
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class IgnoreRequest(BaseModel):
    id: str
    until: Optional[str] = None
    reason: Optional[str] = None


@app.get("/api/ignore")
async def list_ignores(user: Optional[dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # audit log from history ignores table if exists, else from user config
    try:
        from .history import get_ignores

        return get_ignores(user["id"])
    except Exception:
        return []


@app.post("/api/ignore")
async def add_ignore(req: IgnoreRequest, user: Optional[dict] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not req.id:
        raise HTTPException(status_code=400, detail="id required")
    try:
        from .history import add_ignore as history_add_ignore

        history_add_ignore(user["id"], req.id, req.until or "", req.reason or "")
    except Exception:
        pass
    # also return SARIF suppression hint
    return {"id": req.id, "until": req.until, "reason": req.reason, "status": "ignored"}


class SimulateRequest(BaseModel):
    package_json: Optional[str] = None
    lock_file: Optional[str] = None
    lock_file_type: Optional[str] = "package-lock.json"
    ecosystem: Optional[str] = "npm"
    upgrades: list[dict]
    policy_config: Optional[dict] = None
    base_scan: Optional[dict] = None


@app.post("/api/simulate")
async def simulate_endpoint(req: SimulateRequest, request: Request, user: Optional[dict] = Depends(get_current_user)):
    """What-If: no mutation, returns base/proposed/diff + confidence."""
    if not req.upgrades:
        raise HTTPException(status_code=400, detail="upgrades required: [{name, version}]")
    # normalize upgrades
    norm = []
    for u in req.upgrades:
        if not u.get("name") or not u.get("version"):
            raise HTTPException(status_code=400, detail="each upgrade needs name and version")
        norm.append({"name": u["name"], "version": str(u["version"])})
    try:
        from .whatif import simulate

        # Use current scan as base if available via history? For stateless, re-scan base then proposed.
        # We need base packages; parse from supplied manifest
        # Reconstruct base ScanResults from base_scan if manifest missing (e.g., history)
        base_results = None
        base_packages = None
        if req.base_scan:
            try:
                from .parser import Package as PkgCls
                from .scanner import ScanResult as SRCls, Vulnerability as VulnCls

                raw_results = req.base_scan.get("results") or req.base_scan.get("base", {}).get("results") or []
                # If base_scan is full ScanResponse, use its results
                if isinstance(raw_results, list) and raw_results:
                    # try to rebuild ScanResult objects for health calc
                    rebuilt = []
                    for r in raw_results:
                        pkg_data = r.get("package", {})
                        pkg = PkgCls(name=pkg_data.get("name",""), version=pkg_data.get("version",""), type=pkg_data.get("type","dependency"), ecosystem=pkg_data.get("ecosystem","npm"))
                        vulns = []
                        for v in r.get("vulnerabilities", []):
                            vulns.append(VulnCls(id=v.get("id",""), summary=v.get("summary",""), aliases=v.get("aliases",[]), severity=v.get("severity","UNKNOWN"), cvss_score=v.get("cvss_score"), source=v.get("source","osv")))
                        sr = SRCls(package=pkg, vulnerabilities=vulns, health_score=r.get("health_score", 100), unmaintained=r.get("unmaintained", False))
                        # preserve license
                        sr.package.license = pkg_data.get("license","")
                        rebuilt.append(sr)
                    base_results = rebuilt
                    base_packages = [r.package for r in rebuilt]
            except Exception:
                pass

        result = await simulate(
            package_json=req.package_json,
            lock_file=req.lock_file,
            lock_file_type=req.lock_file_type or "package-lock.json",
            ecosystem=req.ecosystem or "npm",
            upgrades=norm,
            policy_config=req.policy_config,
            base_results=base_results,
            base_packages=base_packages,
        )
        # persist simulation separately (do not contaminate scans history)
        try:
            from .history import save_simulation

            save_simulation(user["id"] if user else None, req.package_json or "", norm, result)
        except Exception:
            pass
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/scan/file")
async def scan_file():
    raise HTTPException(status_code=501, detail="File upload endpoint not implemented yet")