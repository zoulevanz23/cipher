import type { ScanRequest, ScanResponse } from "../types";

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

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
