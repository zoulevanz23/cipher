import asyncio
import json
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel


from . import __version__
from .config import merge_config, init_config
from .detector import detect_ecosystems, find_manifest_files
from .parsers import parse_ecosystem
from .parser import parse_dependencies, Package
from .scanner import scan, Vulnerability
from .report import generate_html_report
from .fixer import compute_fixes, generate_fixed_package_json
from .sbom import generate_spdx, generate_cyclonedx
from .export import generate_sarif, generate_csv
from .health import health_grade
from .license import is_unmaintained
from .health import compute_health_score


SEVERITY_COLORS = {
    "CRITICAL": "red",
    "HIGH": "orange3",
    "MEDIUM": "yellow",
    "LOW": "blue",
    "UNKNOWN": "white",
    "NONE": "green",
}


def format_vuln_count(results: list) -> str:
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for r in results:
        for v in r.vulnerabilities:
            sev = v.severity if v.severity in counts else "UNKNOWN"
            if sev in counts:
                counts[sev] += 1
    parts = []
    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        if counts[sev] > 0:
            parts.append(f"[{SEVERITY_COLORS[sev]}]{counts[sev]} {sev}[/]")
    return ", ".join(parts) if parts else "[green]0 vulnerabilities[/]"


def build_results_table(results: list) -> Table:
    table = Table(title="Scan Results", border_style="bright_blue")
    table.add_column("Package", style="cyan")
    table.add_column("Version", style="magenta")
    table.add_column("Vulnerabilities", justify="right")
    table.add_column("Max Severity")
    table.add_column("Ecosystem")

    for r in results:
        count = len(r.vulnerabilities)
        sev = r.max_severity
        sev_str = f"[{SEVERITY_COLORS.get(sev, 'white')}]{sev}[/]"
        vuln_str = f"[{'red' if count > 0 else 'green'}]{count}[/]"
        eco = r.package.ecosystem if hasattr(r.package, 'ecosystem') else "npm"
        table.add_row(r.package.name, r.package.version, vuln_str, sev_str, eco)

    return table


def build_vuln_details_table(results: list) -> Table:
    table = Table(title="Vulnerability Details", border_style="red")
    table.add_column("Package", style="cyan")
    table.add_column("Vulnerability ID")
    table.add_column("Severity")
    table.add_column("Summary")
    for r in results:
        for v in r.vulnerabilities:
            vuln_id = v.id
            if v.aliases:
                cves = [a for a in v.aliases if a.startswith("CVE-")]
                if cves:
                    vuln_id = ", ".join(cves)
            summary = (v.summary[:80] + "...") if v.summary and len(v.summary) > 80 else (v.summary or "")
            sev_str = f"[{SEVERITY_COLORS.get(v.severity, 'white')}]{v.severity}[/]"
            table.add_row(r.package.name, vuln_id, sev_str, summary)
    return table


@click.command()
@click.version_option(__version__, prog_name="vulnchecker")
@click.option("--path", "-p", default=".", help="Project directory path")
@click.option("--lock-file/--no-lock-file", "lock_file", default=True, help="Auto-detect and use lock file for exact versions")
@click.option("--format", "-f", "output_format", type=click.Choice(["table", "json", "summary", "html", "spdx", "cyclonedx", "sarif", "csv"]), default="table", help="Output format")
@click.option("--json", "json_flag", is_flag=True, help="Shorthand for --format json")
@click.option("--output", "-o", help="Output file path (for json/html format)")
@click.option("--min-severity", type=click.Choice(["critical", "high", "medium", "low"]), default="low", help="Minimum severity to report")
@click.option("--ecosystem", type=click.Choice(["npm", "pypi", "go", "maven", "nuget", "rubygems", "cargo"]), help="Ecosystem to scan (auto-detected if omitted)")
@click.option("--fail-on", type=click.Choice(["none", "any", "critical", "high", "medium"]), default="none", help="Exit non-zero if condition met")
@click.option("--fix", "do_fix", is_flag=True, help="Show fix suggestions and generate secure package.json")
@click.option("--quiet", is_flag=True, help="Minimal output (JSON to stdout)")
@click.option("--no-color", is_flag=True, help="Disable colored output")
@click.option("--init-config", "do_init_config", is_flag=True, help="Create a .vulncheckerrc config file")
def main(path, lock_file, output_format, json_flag, output, min_severity, ecosystem, fail_on, do_fix, quiet, no_color, do_init_config):
    console = Console(no_color=no_color)

    if json_flag:
        output_format = "json"

    if quiet:
        output_format = "json"

    project_path = Path(path)

    if do_init_config:
        msg = init_config(project_path)
        console.print(f"[green]{msg}[/]")
        sys.exit(0)

    config = merge_config({
        "path": path,
        "format": output_format,
        "output": output,
        "min_severity": min_severity,
        "ecosystem": ecosystem,
        "fail_on": fail_on,
        "no_color": no_color,
        "quiet": quiet,
    })

    output_format = config["format"]
    output = config["output"]
    min_severity = config["min_severity"]
    ecosystem = config["ecosystem"]
    fail_on = config["fail_on"]

    # --- Ecosystem detection ---
    project_path = Path(config["path"])
    detected_ecosystems = detect_ecosystems(project_path)

    if not ecosystem:
        if not detected_ecosystems:
            # Fall back to npm (check for package.json manually)
            pj = project_path / "package.json"
            if pj.exists():
                ecosystem = "npm"
                detected_ecosystems = ["npm"]
            else:
                console.print("[red]Error:[/] Could not detect project ecosystem. Use --ecosystem to specify.")
                sys.exit(1)
        else:
            ecosystem = detected_ecosystems[0]
    elif ecosystem not in detected_ecosystems:
        # User specified an ecosystem, but we don't detect matching files — try anyway
        pass

    # --- Parse dependencies ---
    all_packages: list[Package] = []

    if ecosystem == "npm":
        # Use existing npm logic (supports lock files)
        package_json_str = None
        if path == "." and not sys.stdin.isatty():
            package_json_str = sys.stdin.read()
        else:
            package_json_path = project_path / "package.json"
            if not package_json_path.exists():
                console.print(f"[red]Error:[/] No package.json found at {package_json_path}")
                sys.exit(1)
            package_json_str = package_json_path.read_text(encoding="utf-8")

        lock_file_str = None
        lock_file_type = None

        if lock_file:
            for lock_path in [project_path / "package-lock.json", project_path / "yarn.lock", project_path / "pnpm-lock.yaml"]:
                if lock_path.exists():
                    lock_file_str = lock_path.read_text(encoding="utf-8")
                    lock_file_type = lock_path.name
                    break

        all_packages = parse_dependencies(
            package_json_str=package_json_str,
            lock_file_str=lock_file_str,
            lock_file_type=lock_file_type,
        )
    else:
        manifest_files = find_manifest_files(project_path, ecosystem)
        if not manifest_files:
            console.print(f"[yellow]No manifest files found for ecosystem '{ecosystem}' in {project_path}[/]")
            sys.exit(0)
        all_packages = parse_ecosystem(ecosystem, manifest_files)

    if not all_packages:
        console.print("[yellow]No dependencies found.[/]")
        sys.exit(0)

    severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    min_sev_level = severity_order.get(min_severity, 1)

    # --- Scan ---
    with console.status("[bold yellow]Scanning dependencies for vulnerabilities...") as status:
        results = asyncio.run(scan(all_packages))

    # --- Fix suggestions ---
    fixes = []
    if ecosystem == "npm":
        package_json_str = None
        if path == "." and not sys.stdin.isatty():
            pass
        else:
            pj = project_path / "package.json"
            if pj.exists():
                package_json_str = pj.read_text(encoding="utf-8")
        has_vulns = any(r.vulnerabilities for r in results)
        if package_json_str and has_vulns and (do_fix or output_format == "table"):
            with console.status("[bold yellow]Querying package registries for fix suggestions...") as status:
                fixes = asyncio.run(compute_fixes(results))
        if do_fix and fixes and package_json_str:
            fixed_json = generate_fixed_package_json(package_json_str, fixes)
            fixed_path = project_path / "package.fixed.json"
            fixed_path.write_text(fixed_json, encoding="utf-8")
            console.print(f"\n[green]Secure package.json written to {fixed_path}[/]")

    # --- Output ---
    if output_format == "html":
        json_results = []
        for r in results:
            pkg_data = {
                "package": {
                    "name": r.package.name,
                    "version": r.package.version,
                    "type": r.package.type,
                    "ecosystem": r.package.ecosystem if hasattr(r.package, 'ecosystem') else "npm",
                },
                "vulnerabilities": [
                    {
                        "id": v.id,
                        "summary": v.summary,
                        "aliases": v.aliases,
                        "severity": v.severity,
                        "published": v.published,
                        "references": v.references,
                    }
                    for v in r.vulnerabilities
                ],
                "max_severity": r.max_severity,
            }
            json_results.append(pkg_data)

        summary = {
            "total_packages": len(results),
            "vulnerable_packages": sum(1 for r in results if r.vulnerabilities),
            "total_vulnerabilities": sum(len(r.vulnerabilities) for r in results),
            "severity_breakdown": {
                "critical": sum(1 for r in results for v in r.vulnerabilities if v.severity == "CRITICAL"),
                "high": sum(1 for r in results for v in r.vulnerabilities if v.severity == "HIGH"),
                "medium": sum(1 for r in results for v in r.vulnerabilities if v.severity == "MEDIUM"),
                "low": sum(1 for r in results for v in r.vulnerabilities if v.severity == "LOW"),
            },
        }

        html = generate_html_report(json_results, summary, project_name=project_path.name, fixes=fixes)
        if output:
            Path(output).write_text(html, encoding="utf-8")
            console.print(f"[green]HTML report written to {output}[/]")
        else:
            console.print(html)

    elif output_format == "json":
        json_output = []
        for r in results:
            pkg_data = {
                "package": {
                    "name": r.package.name,
                    "version": r.package.version,
                    "type": r.package.type,
                    "ecosystem": r.package.ecosystem if hasattr(r.package, 'ecosystem') else "npm",
                },
                "vulnerabilities": [
                    {
                        "id": v.id,
                        "summary": v.summary,
                        "aliases": v.aliases,
                        "severity": v.severity,
                        "published": v.published,
                        "references": v.references,
                    }
                    for v in r.vulnerabilities
                ],
                "max_severity": r.max_severity,
            }
            json_output.append(pkg_data)

        output_data = {
            "summary": {
                "total_packages": len(results),
                "vulnerable_packages": sum(1 for r in results if r.vulnerabilities),
                "total_vulnerabilities": sum(len(r.vulnerabilities) for r in results),
            },
            "results": json_output,
        }

        json_str = json.dumps(output_data, indent=2)
        if output:
            Path(output).write_text(json_str, encoding="utf-8")
            if not quiet:
                console.print(f"[green]Results written to {output}[/]")
        else:
            console.print(json_str)

    elif output_format in ("spdx", "cyclonedx", "sarif", "csv"):
        json_results = []
        for r in results:
            pkg_data = {
                "package": {
                    "name": r.package.name,
                    "version": r.package.version,
                    "type": r.package.type,
                    "ecosystem": r.package.ecosystem if hasattr(r.package, 'ecosystem') else "npm",
                    "license": r.package.license if hasattr(r.package, 'license') else "",
                },
                "vulnerabilities": [
                    {
                        "id": v.id,
                        "summary": v.summary,
                        "aliases": v.aliases,
                        "severity": v.severity,
                        "published": v.published,
                        "references": v.references,
                    }
                    for v in r.vulnerabilities
                ],
                "max_severity": r.max_severity,
            }
            json_results.append(pkg_data)

        summary = {
            "total_packages": len(results),
            "vulnerable_packages": sum(1 for r in results if r.vulnerabilities),
            "total_vulnerabilities": sum(len(r.vulnerabilities) for r in results),
            "severity_breakdown": {
                "critical": sum(1 for r in results for v in r.vulnerabilities if v.severity == "CRITICAL"),
                "high": sum(1 for r in results for v in r.vulnerabilities if v.severity == "HIGH"),
                "medium": sum(1 for r in results for v in r.vulnerabilities if v.severity == "MEDIUM"),
                "low": sum(1 for r in results for v in r.vulnerabilities if v.severity == "LOW"),
            },
        }

        if output_format == "spdx":
            export_str = generate_spdx(json_results, summary, project_path.name)
        elif output_format == "cyclonedx":
            export_str = generate_cyclonedx(json_results, summary, project_path.name)
        elif output_format == "sarif":
            export_str = generate_sarif(json_results, summary, project_path.name)
        else:
            export_str = generate_csv(json_results, summary)

        if output:
            Path(output).write_text(export_str, encoding="utf-8")
            console.print(f"[green]{output_format.upper()} written to {output}[/]")
        else:
            console.print(export_str)

    elif output_format == "summary":
        vulnerable_count = sum(1 for r in results if r.vulnerabilities)
        total_vulns = sum(len(r.vulnerabilities) for r in results)
        console.print(Panel(
            f"[bold]Packages scanned:[/] {len(results)}\n"
            f"[bold]Vulnerable packages:[/] [{'red' if vulnerable_count > 0 else 'green'}]{vulnerable_count}[/]\n"
            f"[bold]Total vulnerabilities:[/] {format_vuln_count(results)}",
            title="Summary",
            border_style="bright_blue",
        ))

    else:
        console.print(build_results_table(results))

        vulnerable_results = [r for r in results if r.vulnerabilities]
        if vulnerable_results:
            console.print(build_vuln_details_table(vulnerable_results))

        if fixes:
            console.print("\n[bold green]Recommended Fixes:[/]")
            for f in fixes:
                console.print(f"  npm install {f['package_name']}@{f['recommended_version']}")

    total_vulns = sum(len(r.vulnerabilities) for r in results)
    if fail_on == "any" and total_vulns > 0:
        sys.exit(1)
    elif fail_on == "critical":
        for r in results:
            if any(v.severity == "CRITICAL" for v in r.vulnerabilities):
                sys.exit(1)
    elif fail_on == "high":
        for r in results:
            if any(v.severity in ("CRITICAL", "HIGH") for v in r.vulnerabilities):
                sys.exit(1)
    elif fail_on == "medium":
        for r in results:
            if any(v.severity in ("CRITICAL", "HIGH", "MEDIUM") for v in r.vulnerabilities):
                sys.exit(1)


if __name__ == "__main__":
    main()
