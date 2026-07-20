import httpx

GITHUB_API = "https://api.github.com"


def format_comment(results: list, summary: dict, fixes: list) -> str:
    total = summary.get("total_packages", 0)
    vuln_pkgs = summary.get("vulnerable_packages", 0)
    total_vulns = summary.get("total_vulnerabilities", 0)

    lines = [
        f"### VulnChecker Scan Results",
        f"",
        f"**Summary**: {vuln_pkgs}/{total} packages vulnerable · {total_vulns} total vulnerabilities",
        f"",
    ]

    if fixes:
        lines.append("**Recommended Fixes**:")
        for f in fixes:
            risk = f.get("risk_label", "")
            lines.append(f"- `{f['package_name']}` {f['current_version']} → `{f['recommended_version']}` {risk}")
        lines.append("")

    for r in results:
        vulns = r.get("vulnerabilities", [])
        if vulns:
            pkg = r.get("package", {})
            lines.append(f"- ❌ `{pkg.get('name', '')}` ({len(vulns)} vuln{'s' if len(vulns)>1 else ''})")
            for v in vulns[:3]:
                lines.append(f"  - `{v.get('id','')}` {v.get('severity','')}: {v.get('summary','')[:100]}")
            if len(vulns) > 3:
                lines.append(f"  - ... and {len(vulns)-3} more")

    return "\n".join(lines)


async def post_github_comment(token: str, repo: str, pr_number: int, body: str) -> bool:
    url = f"{GITHUB_API}/repos/{repo}/issues/{pr_number}/comments"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
            json={"body": body},
            timeout=15,
        )
    return resp.status_code == 201
