import type { FixSuggestion, ScanRequest, ScanResponse } from "../types";

const BASE = "/api";

export async function scanDependencies(req: ScanRequest): Promise<ScanResponse> {
  const res = await fetch(`${BASE}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFixedPackageJson(
  packageJson: string,
  fixes: FixSuggestion[]
): Promise<{ fixed_package_json: string }> {
  const res = await fetch(`${BASE}/scan/fix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package_json: packageJson, fixes }),
  });
  if (!res.ok) throw new Error("Failed to generate fixed package.json");
  return res.json();
}

export async function downloadReport(
  results: ScanResponse["results"],
  summary: ScanResponse["summary"],
  projectName: string = "",
  fixes: ScanResponse["fixes"] = []
): Promise<string> {
  const res = await fetch(`${BASE}/scan/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results, summary, project_name: projectName, fixes }),
  });
  if (!res.ok) throw new Error("Failed to generate report");
  return res.text();
}

export async function fetchExport(
  results: ScanResponse["results"],
  summary: ScanResponse["summary"],
  format: string,
  projectName: string = ""
): Promise<string> {
  const res = await fetch(`${BASE}/scan/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results, summary, project_name: projectName, format }),
  });
  if (!res.ok) throw new Error(`Failed to export ${format}`);
  const data = await res.json();
  return data.content;
}

export async function saveScan(
  results: ScanResponse["results"],
  summary: ScanResponse["summary"],
  fixes: ScanResponse["fixes"] = [],
  projectName: string = ""
): Promise<{ scan_id: number }> {
  const res = await fetch(`${BASE}/scan/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results, summary, fixes, project_name: projectName }),
  });
  if (!res.ok) throw new Error("Failed to save scan");
  return res.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
