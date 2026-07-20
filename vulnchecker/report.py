import json
from datetime import datetime


def _severity_color(severity: str) -> str:
    return {
        "CRITICAL": "#ff4757",
        "HIGH": "#ff6348",
        "MEDIUM": "#ffa502",
        "LOW": "#2ed573",
        "UNKNOWN": "#9ca3af",
        "NONE": "#2ed573",
    }.get(severity, "#9ca3af")


def _severity_bg(severity: str) -> str:
    return {
        "CRITICAL": "#ff475720",
        "HIGH": "#ff634820",
        "MEDIUM": "#ffa50220",
        "LOW": "#2ed57320",
        "UNKNOWN": "#9ca3af20",
        "NONE": "#2ed57320",
    }.get(severity, "#9ca3af20")


def _escape_html(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def generate_html_report(results: list, summary: dict, project_name: str = "", fixes: list = None) -> str:
    results_json = json.dumps(results, indent=2)
    summary_json = json.dumps(summary, indent=2)
    fixes = fixes or []
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    project = _escape_html(project_name or "Vulnerability Scan")

    total = summary.get("total_packages", 0)
    vulnerable = summary.get("vulnerable_packages", 0)
    total_vulns = summary.get("total_vulnerabilities", 0)
    sb = summary.get("severity_breakdown", {})

    report_rows = ""
    for r in results:
        pkg = r.get("package", {})
        name = _escape_html(pkg.get("name", ""))
        version = _escape_html(pkg.get("version", ""))
        ecosystem = _escape_html(pkg.get("ecosystem", ""))
        max_sev = r.get("max_severity", "NONE")
        vulns = r.get("vulnerabilities", [])
        vuln_count = len(vulns)
        safe = vuln_count == 0

        sev_color = _severity_color(max_sev)
        sev_bg = _severity_bg(max_sev)
        badge = f"SAFE" if safe else f"{vuln_count} vuln"
        badge_color = "#2ed573" if safe else sev_color

        vuln_details = ""
        for v in vulns:
            vid = _escape_html(v.get("id", ""))
            vsev = v.get("severity", "UNKNOWN")
            vcolor = _severity_color(vsev)
            vbg = _severity_bg(vsev)
            vsummary = _escape_html(v.get("summary", "No summary"))
            aliases = ", ".join(_escape_html(a) for a in v.get("aliases", []))
            published = v.get("published", "")[:10]
            refs = v.get("references", [])[:3]

            ref_html = ""
            for ref in refs:
                url = _escape_html(ref.get("url", ""))
                ref_html += f'<a href="{url}" target="_blank" class="ref-link">{url}</a>\n'

            vuln_details += f"""
            <div class="vuln-card" style="border-left: 3px solid {vcolor}; background: {vbg};">
              <div class="vuln-header">
                <span class="vuln-id">{vid}</span>
                <span class="vuln-sev" style="background: {vcolor}; color: white;">{vsev}</span>
              </div>
              {f'<div class="vuln-aliases">{aliases}</div>' if aliases else ''}
              <div class="vuln-summary">{vsummary}</div>
              <div class="vuln-meta">Published: {published}</div>
              {f'<div class="vuln-refs">{ref_html}</div>' if ref_html else ''}
            </div>
            """

        fix_html = ""
        for f in fixes:
            if f.get("package_name") == name:
                fix_html = f"""
                <div class="fix-card" style="border-left: 3px solid #2ed573; background: #2ed57310; border-radius: 8px; padding: 12px; margin-top: 8px;">
                  <div style="font-size:0.75rem; color:#2ed573; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Recommended Fix</div>
                  <div style="font-size:0.85rem;">
                    <span style="color:#9ca3af;">Upgrade</span>
                    <span style="color:#ff4757; text-decoration:line-through;">{_escape_html(f.get('current_version',''))}</span>
                    <span style="color:#9ca3af;"> → </span>
                    <span style="color:#2ed573; font-weight:600;">{_escape_html(f.get('recommended_version',''))}</span>
                  </div>
                  <div style="font-size:0.75rem; color:#6b7280; margin-top:4px; font-family:'SF Mono',Monaco,monospace;">$ npm install {_escape_html(f.get('package_name',''))}@{_escape_html(f.get('recommended_version',''))}</div>
                </div>
                """
                break

        report_rows += f"""
        <div class="pkg-card">
          <div class="pkg-header" onclick="togglePkg(this)">
            <div>
              <span class="pkg-name">{name}</span>
              <span class="pkg-version">{version}</span>
              <span class="pkg-eco">{ecosystem}</span>
            </div>
            <div class="pkg-meta">
              <span class="pkg-badge" style="background: {badge_color}; color: {'#000' if safe else '#fff'};">{badge}</span>
              <span class="toggle-icon">▸</span>
            </div>
          </div>
          <div class="pkg-body">
            {fix_html}
            {vuln_details if vuln_details else '<div class="safe-msg">No known vulnerabilities for this version.</div>'}
          </div>
        </div>
        """

    max_total = max(sb.get("critical", 0), sb.get("high", 0), sb.get("medium", 0), sb.get("low", 0), 1)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{project} — VulnChecker Report</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f12; color: #e5e7eb; padding: 24px; }}
  h1 {{ font-size: 1.5rem; font-weight: 700; margin-bottom: 4px; }}
  .subtitle {{ color: #9ca3af; font-size: 0.85rem; margin-bottom: 24px; }}
  .summary-row {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }}
  .stat-card {{ background: #18181d; border: 1px solid #2a2a2e; border-radius: 12px; padding: 16px 24px; flex: 1; min-width: 140px; }}
  .stat-card .num {{ font-size: 1.8rem; font-weight: 700; }}
  .stat-card .label {{ font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }}
  .severity-bars {{ background: #18181d; border: 1px solid #2a2a2e; border-radius: 12px; padding: 16px 24px; flex: 2; min-width: 280px; }}
  .sev-row {{ display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.8rem; }}
  .sev-row .sev-label {{ width: 60px; color: #9ca3af; }}
  .sev-row .sev-bar {{ flex: 1; height: 16px; background: #2a2a2e; border-radius: 8px; overflow: hidden; }}
  .sev-row .sev-fill {{ height: 100%; border-radius: 8px; transition: width 0.5s; }}
  .sev-row .sev-count {{ width: 30px; text-align: right; font-weight: 600; }}
  .pkg-card {{ background: #18181d; border: 1px solid #2a2a2e; border-radius: 10px; margin-bottom: 8px; overflow: hidden; }}
  .pkg-header {{ display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; user-select: none; }}
  .pkg-header:hover {{ background: #1f1f25; }}
  .pkg-name {{ font-weight: 600; }}
  .pkg-version {{ color: #9ca3af; font-size: 0.8rem; margin-left: 8px; }}
  .pkg-eco {{ color: #6b7280; font-size: 0.75rem; margin-left: 6px; padding: 1px 6px; border: 1px solid #2a2a2e; border-radius: 4px; }}
  .pkg-badge {{ font-size: 0.75rem; font-weight: 600; padding: 2px 10px; border-radius: 10px; }}
  .toggle-icon {{ margin-left: 12px; color: #6b7280; transition: transform 0.2s; }}
  .pkg-header.open .toggle-icon {{ transform: rotate(90deg); }}
  .pkg-body {{ display: none; padding: 0 16px 16px; }}
  .pkg-header.open + .pkg-body {{ display: block; }}
  .vuln-card {{ border-radius: 8px; padding: 12px; margin-top: 8px; }}
  .vuln-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }}
  .vuln-id {{ font-family: 'SF Mono', Monaco, monospace; font-size: 0.85rem; font-weight: 600; }}
  .vuln-sev {{ font-size: 0.7rem; font-weight: 700; padding: 1px 8px; border-radius: 8px; text-transform: uppercase; }}
  .vuln-aliases {{ font-size: 0.8rem; color: #9ca3af; margin-bottom: 4px; }}
  .vuln-summary {{ font-size: 0.85rem; color: #d1d5db; margin-bottom: 4px; }}
  .vuln-meta {{ font-size: 0.75rem; color: #6b7280; }}
  .vuln-refs {{ margin-top: 6px; }}
  .ref-link {{ display: block; font-size: 0.75rem; color: #00ff41; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
  .ref-link:hover {{ text-decoration: underline; }}
  .safe-msg {{ color: #2ed573; font-size: 0.85rem; padding: 8px 0; }}
</style>
</head>
<body>
  <h1>{project}</h1>
  <div class="subtitle">Generated {timestamp} &middot; vulnchecker v0.1.0</div>

  <div class="summary-row">
    <div class="stat-card">
      <div class="num" style="color: #00ff41;">{total}</div>
      <div class="label">Packages Scanned</div>
    </div>
    <div class="stat-card">
      <div class="num" style="color: {'#ff4757' if vulnerable > 0 else '#2ed573'};">{vulnerable}</div>
      <div class="label">Vulnerable Packages</div>
    </div>
    <div class="stat-card">
      <div class="num" style="color: {'#ff4757' if total_vulns > 0 else '#2ed573'};">{total_vulns}</div>
      <div class="label">Total Vulnerabilities</div>
    </div>
    <div class="severity-bars">
      <div class="sev-row"><span class="sev-label">CRITICAL</span><div class="sev-bar"><div class="sev-fill" style="width: {sb.get('critical',0)/max_total*100}%; background:#ff4757;"></div></div><span class="sev-count" style="color:#ff4757;">{sb.get('critical',0)}</span></div>
      <div class="sev-row"><span class="sev-label">HIGH</span><div class="sev-bar"><div class="sev-fill" style="width: {sb.get('high',0)/max_total*100}%; background:#ff6348;"></div></div><span class="sev-count" style="color:#ff6348;">{sb.get('high',0)}</span></div>
      <div class="sev-row"><span class="sev-label">MEDIUM</span><div class="sev-bar"><div class="sev-fill" style="width: {sb.get('medium',0)/max_total*100}%; background:#ffa502;"></div></div><span class="sev-count" style="color:#ffa502;">{sb.get('medium',0)}</span></div>
      <div class="sev-row"><span class="sev-label">LOW</span><div class="sev-bar"><div class="sev-fill" style="width: {sb.get('low',0)/max_total*100}%; background:#2ed573;"></div></div><span class="sev-count" style="color:#2ed573;">{sb.get('low',0)}</span></div>
    </div>
  </div>

  <div id="results">{report_rows}</div>

  <script>
    function togglePkg(el) {{
      el.classList.toggle('open');
    }}
  </script>
</body>
</html>"""
