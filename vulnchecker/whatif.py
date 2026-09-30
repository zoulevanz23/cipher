import copy
from typing import Optional

from .parser import Package, parse_dependencies
from .scanner import ScanResult, scan
from .health import compute_health_score, health_grade
from .policy import evaluate_policy
from .sbom_diff import diff_sbom

# Confidence helper shared with frontend
def confidence_for_upgrade(
    *,
    is_transitive: bool,
    risk: str,
    known_fixed: bool,
    has_lockfile: bool,
    peer_conflict: bool = False,
) -> dict:
    risk = (risk or "patch").lower()
    if risk == "major" or peer_conflict:
        return {"level": "LOW", "reasons": ["major upgrade", "peer dependency impact", "untested compatibility"], "color": "var(--crit)"}
    if is_transitive:
        return {"level": "MEDIUM", "reasons": ["transitive dependency", "override required", "heuristic peer analysis"], "color": "var(--warn)"}
    if risk == "patch" and known_fixed and has_lockfile:
        return {"level": "HIGH", "reasons": ["direct dependency", "patch upgrade", "known fixed version", "lockfile available"], "color": "var(--pass)"}
    if risk == "patch" and known_fixed:
        return {"level": "HIGH", "reasons": ["direct dependency", "patch upgrade", "known fixed version"], "color": "var(--pass)"}
    return {"level": "MEDIUM", "reasons": ["minor update", "safe", "heuristic peer analysis"], "color": "var(--warn)"}


def _apply_upgrades_to_manifest(package_json_str: str, upgrades: list[dict]) -> str:
    """Apply single or multi upgrades to package.json string for simulation. Non-destructive."""
    import json

    try:
        data = json.loads(package_json_str) if package_json_str else {}
    except Exception:
        data = {}
    # ensure sections exist
    for section in ("dependencies", "devDependencies", "peerDependencies"):
        if section not in data:
            continue
    upgrade_map = {u["name"]: u["version"] for u in upgrades}
    for section in ("dependencies", "devDependencies"):
        deps = data.get(section, {})
        if not isinstance(deps, dict):
            continue
        for pkg, ver in list(deps.items()):
            if pkg in upgrade_map:
                new_ver = upgrade_map[pkg]
                # preserve ^/~ prefix if present, else use exact
                prefix = ""
                if isinstance(ver, str) and ver and ver[0] in "^~":
                    prefix = ver[0]
                deps[pkg] = f"{prefix}{new_ver}"
                upgrade_map.pop(pkg, None)
        data[section] = deps
    # remaining upgrades are transitive → represent as overrides (npm) for simulation
    # we keep them as top-level overrides for parsing simulation at Package list level
    if upgrade_map:
        # store as _simulated_overrides for later Package-level simulation
        data["_simulated_overrides"] = upgrade_map
    return json.dumps(data)


async def simulate(
    *,
    package_json: Optional[str] = None,
    lock_file: Optional[str] = None,
    lock_file_type: str = "package-lock.json",
    ecosystem: str = "npm",
    upgrades: list[dict],
    base_results: Optional[list[ScanResult]] = None,
    base_packages: Optional[list[Package]] = None,
    existing_scan_summary: Optional[dict] = None,
    policy_config: Optional[dict] = None,
    # for health/policy diff we need current scan data
) -> dict:
    """
    S1 engine: single upgrade (S2.5 supports multi). Returns {base, proposed, diff, changes, confidence}
    upgrades: [{name, version}]
    If base_results/packages provided, avoids re-scanning base.
    Otherwise parses manifest.
    """
    import json as _json

    has_lockfile = bool(lock_file)

    # Resolve base packages if not supplied
    if base_packages is None:
        if ecosystem == "npm":
            base_packages = parse_dependencies(package_json_str=package_json, lock_file_str=lock_file, lock_file_type=lock_file_type)
        else:
            from .parsers import parse_ecosystem
            raw = package_json or "{}"
            base_packages = parse_ecosystem(ecosystem, [("package.json", raw)])

    if base_results is None:
        # we need to scan base if not provided — caller should provide to avoid double scan
        # but we can synthesize minimal base_results from base_packages with empty vulns if no scan yet
        # For engine correctness, we require base_results; if not supplied, scan them now
        base_results = await scan(base_packages)

    # Build proposed packages: clone and apply version upgrades
    upgrade_map = {u["name"]: u["version"] for u in upgrades}
    proposed_packages: list[Package] = []
    for pkg in base_packages:
        if pkg.name in upgrade_map:
            new_pkg = Package(name=pkg.name, version=upgrade_map[pkg.name], type=pkg.type, ecosystem=pkg.ecosystem, license=pkg.license, dependencies=copy.deepcopy(pkg.dependencies) if pkg.dependencies else None)
            proposed_packages.append(new_pkg)
        else:
            # also handle overrides: if pkg is transitive and upgrade targets it,
            # we simulate by upgrading that transitive package even if not direct
            proposed_packages.append(copy.deepcopy(pkg))

    # For overrides where pkg not in direct list (transitive), we need to inject it as if upgraded
    # Find transitive names not in base_packages but in upgrades — simulate by adding/replacing
    base_names = {p.name for p in base_packages}
    for name, ver in upgrade_map.items():
        if name not in base_names:
            # transitive override: add as package to scan (will be scanned as upgraded)
            # Determine ecosystem from base first pkg or default
            eco = base_packages[0].ecosystem if base_packages else ecosystem
            proposed_packages.append(Package(name=name, version=ver, type="dependency", ecosystem=eco))

    # Scan proposed versions (only need to scan upgraded packages + keep others cached)
    # For efficiency, scan only upgraded packages, reuse base results for unchanged
    upgraded_names = set(upgrade_map.keys())
    to_scan = [p for p in proposed_packages if p.name in upgraded_names]
    # also need to ensure we have fresh scan for upgraded
    proposed_results_map: dict[str, ScanResult] = {}
    if to_scan:
        fresh = await scan(to_scan)
        for r in fresh:
            proposed_results_map[r.package.name] = r

    # Merge: for each base result, if upgraded, use fresh; else reuse base
    proposed_results: list[ScanResult] = []
    for base_r in base_results:
        if base_r.package.name in proposed_results_map:
            new_r = proposed_results_map[base_r.package.name]
            # preserve license/unmaintained? will be recomputed in health step, but keep structure
            proposed_results.append(new_r)
        else:
            # copy base result as-is (no change)
            proposed_results.append(copy.deepcopy(base_r))
    # Add any newly introduced transitive that wasn't in base
    for name in upgraded_names:
        if name not in {r.package.name for r in base_results}:
            if name in proposed_results_map:
                proposed_results.append(proposed_results_map[name])

    # Compute health/policy for base and proposed
    def health_avg(results: list[ScanResult]) -> int:
        if not results:
            return 100
        scores = []
        for r in results:
            # health already computed if base_results came from scan+compose; but raw ScanResult may have health 100 default
            # Recompute via health.py for truthfulness if needed
            try:
                from .health import compute_health_score
                hs = compute_health_score(r)
            except Exception:
                hs = getattr(r, "health_score", 100)
            scores.append(hs)
        return round(sum(scores) / len(scores)) if scores else 100

    base_health = health_avg(base_results)
    proposed_health = health_avg(proposed_results)

    def severity_breakdown(results: list[ScanResult]) -> dict:
        return {
            "critical": sum(1 for r in results for v in r.vulnerabilities if v.severity == "CRITICAL"),
            "high": sum(1 for r in results for v in r.vulnerabilities if v.severity == "HIGH"),
            "medium": sum(1 for r in results for v in r.vulnerabilities if v.severity == "MEDIUM"),
            "low": sum(1 for r in results for v in r.vulnerabilities if v.severity == "LOW"),
        }

    base_sev = severity_breakdown(base_results)
    prop_sev = severity_breakdown(proposed_results)

    # Policy diff
    base_policy = evaluate_policy(
        {"total_packages": len(base_results), "vulnerable_packages": sum(1 for r in base_results if r.vulnerabilities), "total_vulnerabilities": sum(len(r.vulnerabilities) for r in base_results), "severity_breakdown": base_sev},
        base_health,
        config=policy_config or {},
    )
    prop_policy = evaluate_policy(
        {"total_packages": len(proposed_results), "vulnerable_packages": sum(1 for r in proposed_results if r.vulnerabilities), "total_vulnerabilities": sum(len(r.vulnerabilities) for r in proposed_results), "severity_breakdown": prop_sev},
        proposed_health,
        config=policy_config or {},
    )

    # Diff via sbom-like key
    def to_sbom_like(results: list[ScanResult]) -> list:
        return [{"package": {"name": r.package.name, "version": r.package.version}, "vulnerabilities": [{"id": v.id} for v in r.vulnerabilities]} for r in results]

    diff = diff_sbom(to_sbom_like(base_results), to_sbom_like(proposed_results))

    # Build changes with confidence
    changes = []
    for u in upgrades:
        name = u["name"]
        to_ver = u["version"]
        # find base and proposed for that pkg
        base_r = next((r for r in base_results if r.package.name == name), None)
        prop_r = next((r for r in proposed_results if r.package.name == name), None)
        from_ver = base_r.package.version if base_r else "unknown"
        is_transitive = False
        # transitive if not in direct manifest dependencies
        try:
            import json as _j
            manifest = _json.loads(package_json or "{}")
            deps = {**manifest.get("dependencies", {}), **manifest.get("devDependencies", {})}
            is_transitive = name not in deps
        except Exception:
            is_transitive = False
        # risk via safety
        try:
            from .safety import classify_upgrade
            risk = classify_upgrade(from_ver, to_ver)
        except Exception:
            risk = "patch"
        known_fixed = to_ver not in ("unknown", "latest") and "x" not in to_ver
        # Determine peer conflict via registry peerDependencies (heuristic, best effort)
        peer_conflict = False
        # we don't fetch here to keep fast; assume major => potential peer
        if risk == "major":
            peer_conflict = True
        conf = confidence_for_upgrade(is_transitive=is_transitive, risk=risk, known_fixed=known_fixed, has_lockfile=has_lockfile, peer_conflict=peer_conflict)
        # affected paths: for now, if transitive, path is [direct -> transitive], else [pkg]
        affected_paths = 1 if not is_transitive else 2  # placeholder; real tree paths would be computed via tree.py
        changes.append({
            "name": name,
            "from": from_ver,
            "to": to_ver,
            "is_transitive": is_transitive,
            "risk": risk,
            "confidence": conf,
            "affected_paths": affected_paths,
            "override_required": is_transitive,
            "base_vulns": len(base_r.vulnerabilities) if base_r else 0,
            "proposed_vulns": len(prop_r.vulnerabilities) if prop_r else 0,
        })

    # Overall confidence: LOW if any LOW, else MEDIUM if any MEDIUM, else HIGH
    levels = [c["confidence"]["level"] for c in changes]
    overall = "HIGH" if levels and all(l == "HIGH" for l in levels) else ("LOW" if "LOW" in levels else "MEDIUM" if "MEDIUM" in levels else "UNKNOWN")

    return {
        "base": {
            "vulnerabilities": sum(len(r.vulnerabilities) for r in base_results),
            "severity_breakdown": base_sev,
            "health": base_health,
            "health_grade": health_grade(base_health),
            "policy": base_policy,
            "packages": len(base_results),
        },
        "proposed": {
            "vulnerabilities": sum(len(r.vulnerabilities) for r in proposed_results),
            "severity_breakdown": prop_sev,
            "health": proposed_health,
            "health_grade": health_grade(proposed_health),
            "policy": prop_policy,
            "packages": len(proposed_results),
        },
        "diff": {
            "vulnerabilities": {"before": sum(len(r.vulnerabilities) for r in base_results), "after": sum(len(r.vulnerabilities) for r in proposed_results), "delta": sum(len(r.vulnerabilities) for r in proposed_results) - sum(len(r.vulnerabilities) for r in base_results)},
            "severity": {k: {"before": base_sev.get(k, 0), "after": prop_sev.get(k, 0)} for k in ["critical", "high", "medium", "low"]},
            "health": {"before": base_health, "after": proposed_health, "delta": proposed_health - base_health},
            "policy": {"before": base_policy, "after": prop_policy},
            "packages": diff,
        },
        "changes": changes,
        "confidence": {"level": overall, "details": changes},
    }
