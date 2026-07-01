import asyncio
import json
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.columns import Columns

from .parser import parse_dependencies, Package
from .scanner import scan, Vulnerability

console = Console()


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
    table.add_column("Type")

    for r in results:
        count = len(r.vulnerabilities)
        sev = r.max_severity
        sev_str = f"[{SEVERITY_COLORS.get(sev, 'white')}]{sev}[/]"
        vuln_str = f"[{'red' if count > 0 else 'green'}]{count}[/]"
        table.add_row(r.package.name, r.package.version, vuln_str, sev_str, r.package.type)

    return table


def build_vuln_panel(vuln: Vulnerability) -> Panel:
    aliases_str = ", ".join(vuln.aliases) if vuln.aliases else "N/A"
    content = (
        f"[bold]ID:[/] {vuln.id}\n"
        f"[bold]Severity:[/] [{SEVERITY_COLORS.get(vuln.severity, 'white')}]{vuln.severity}[/]\n"
        f"[bold]CVEs:[/] {aliases_str}\n"
        f"[bold]Published:[/] {vuln.published[:10] if vuln.published else 'N/A'}\n"
        f"[bold]Summary:[/] {vuln.summary}\n"
    )
    if vuln.references:
        content += f"\n[bold]References:[/]"
        for ref in vuln.references[:3]:
            content += f"\n  {ref.get('url', '')}"

    return Panel(content, title=f"[bold]{vuln.id}[/]", border_style=SEVERITY_COLORS.get(vuln.severity, "white"))


@click.command()
@click.option("--path", "-p", default=".", help="Project directory path")
@click.option("--lock-file", is_flag=True, help="Use lock file for exact versions")
@click.option("--format", "-f", "output_format", type=click.Choice(["table", "json", "summary"]), default="table")
@click.option("--output", "-o", help="Output file path (for json format)")
@click.option("--min-severity", type=click.Choice(["critical", "high", "medium", "low"]), default="low", help="Minimum severity to report")
@click.option("--fail-on", type=click.Choice(["none", "any", "critical", "high", "medium"]), default="none", help="Exit non-zero if condition met")
def main(path, lock_file, output_format, output, min_severity, fail_on):
    project_path = Path(path)

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

    packages = parse_dependencies(
        package_json_str=package_json_str,
        lock_file_str=lock_file_str,
        lock_file_type=lock_file_type,
    )

    if not packages:
        console.print("[yellow]No dependencies found.[/]")
        sys.exit(0)

    severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    min_sev_level = severity_order.get(min_severity, 1)

    with console.status("[bold green]Scanning dependencies against OSV database...") as status:
        results = asyncio.run(scan(packages))
        filtered_results = []
        for r in results:
            r.vulnerabilities = [
                v for v in r.vulnerabilities
                if severity_order.get(v.severity.lower(), 0) >= min_sev_level
            ]
            filtered_results.append(r)
        results = filtered_results

    if output_format == "json":
        json_output = []
        for r in results:
            pkg_data = {
                "package": {"name": r.package.name, "version": r.package.version, "type": r.package.type},
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
            console.print(f"[green]Results written to {output}[/]")
        else:
            console.print(json_str)
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

        vuln_panels = []
        for r in results:
            for v in r.vulnerabilities:
                vuln_panels.append(build_vuln_panel(v))
        if vuln_panels:
            console.print("\n[bold]Vulnerability Details:[/]")
            for i in range(0, len(vuln_panels), 2):
                batch = vuln_panels[i : i + 2]
                console.print(Columns(batch))

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
