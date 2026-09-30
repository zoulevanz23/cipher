from typing import Any

DEFAULT_POLICY = {
    "health_min": None,  # int 0-100 or None
    "max_critical": None,
    "max_high": None,
    "max_medium": None,
    "max_low": None,
    "license_denylist": [],
    "license_allowlist": None,  # None means no allowlist enforcement
}


def evaluate_policy(
    summary: dict,
    health_avg: int | None,
    license_violations: int = 0,
    config: dict[str, Any] | None = None,
) -> dict:
    policy = (config or {}).get("policies") or (config or {}).get("policy") or {}
    # support both top-level and nested
    if not policy:
        # also check flat keys like health_min at top level for backwards compat
        policy = {k: config.get(k) for k in DEFAULT_POLICY if k in (config or {})}

    health_min = policy.get("health_min")
    max_critical = policy.get("max_critical")
    max_high = policy.get("max_high")
    max_medium = policy.get("max_medium")
    max_low = policy.get("max_low")
    # legacy: fail_on
    fail_on = (config or {}).get("fail_on", "none")
    if fail_on and fail_on != "none" and max_critical is None and max_high is None:
        order = {"critical": 4, "high": 3, "medium": 2, "low": 1, "none": 0}
        lvl = order.get(fail_on.lower(), 0)
        if lvl >= 4:
            max_critical = 0
        if lvl >= 3:
            max_high = 0 if max_high is None else max_high
        if lvl >= 2:
            max_medium = 0 if max_medium is None else max_medium
        if lvl >= 1:
            max_low = 0 if max_low is None else max_low

    violations: list[str] = []
    severity = summary.get("severity_breakdown", {})
    if health_min is not None and health_avg is not None:
        try:
            if health_avg < int(health_min):
                violations.append(f"health {health_avg} < {health_min}")
        except Exception:
            pass
    if max_critical is not None and severity.get("critical", 0) > int(max_critical):
        violations.append(f"critical {severity.get('critical')} > {max_critical}")
    if max_high is not None and severity.get("high", 0) > int(max_high):
        violations.append(f"high {severity.get('high')} > {max_high}")
    if max_medium is not None and severity.get("medium", 0) > int(max_medium):
        violations.append(f"medium {severity.get('medium')} > {max_medium}")
    if max_low is not None and severity.get("low", 0) > int(max_low):
        violations.append(f"low {severity.get('low')} > {max_low}")
    if license_violations and license_violations > 0:
        # if policy defines license_denylist, any violation fails
        denylist = policy.get("license_denylist") or []
        if denylist:
            violations.append(f"license violations {license_violations}")

    return {"pass": len(violations) == 0, "violations": violations, "policy": policy}
