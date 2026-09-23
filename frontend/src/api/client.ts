import type { FixSuggestion, ScanProgressEvent, ScanRequest, ScanResponse, ScanUrlRequest } from "../types";

const BASE = "/api";
const TOKEN_KEY = "vulnchecker_token";

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }
function authHeader(): Record<string, string> { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

/* API errors carry their HTTP status so the UI can map cases
   (409 conflict → suggest sign-in, 429 → show wait time). */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function authRegister(email: string, password: string): Promise<{ token: string; user_id: number }> {
  const r = await fetch(`${BASE}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new ApiError(r.status, d.detail || "Register failed");
  setToken(d.token); return d;
}
export async function authLogin(email: string, password: string): Promise<{ token: string }> {
  const r = await fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new ApiError(r.status, d.detail || "Login failed");
  setToken(d.token); return d;
}
export async function authAnonymous(): Promise<{ token: string }> {
  const r = await fetch(`${BASE}/auth/anonymous`, { method: "POST" });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.detail || "Anonymous failed");
  setToken(d.token); return d;
}
/* Google Identity Services sign-in. The backend verifies the ID token
   and auto-creates the account on first sign-in. */
export async function authGoogle(idToken: string): Promise<{ token: string; user_id: number; email: string; is_new: boolean }> {
  const r = await fetch(`${BASE}/auth/google`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_token: idToken }) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new ApiError(r.status, d.detail || "Google sign-in failed");
  setToken(d.token); return d;
}
export interface AuthMe {
  user_id: number;
  email: string;
  is_anonymous: boolean;
  created_at: string | null;
  credits: { credits: number; reset_in_hours: number };
  stats: { scan_count: number; total_vulnerabilities: number };
}

export async function authMe(): Promise<AuthMe> {
  const r = await fetch(`${BASE}/auth/me`, { headers: { ...authHeader() } });
  if (!r.ok) throw new Error("Not authenticated");
  return r.json();
}

export interface HistoryEntry {
  id: number;
  timestamp: string;
  project_name: string;
  total_packages: number;
  vulnerable_packages: number;
  total_vulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  results_json?: string;
  fixes_json?: string;
}

/* Fetch one saved scan from the caller's own history. */
export async function getHistoryScan(scanId: number): Promise<HistoryEntry> {
  const r = await fetch(`${BASE}/scan/history/${scanId}`, { headers: { ...authHeader() } });
  if (r.status === 404) throw new Error("Scan not found in your history.");
  if (!r.ok) throw new Error("Could not load scan.");
  return r.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const r = await fetch(`${BASE}/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: "Could not change password" }));
    throw new Error(err.detail || "Could not change password");
  }
}

export async function deleteAccount(): Promise<void> {
  const r = await fetch(`${BASE}/auth/account`, { method: "DELETE", headers: { ...authHeader() } });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: "Could not delete account" }));
    throw new Error(err.detail || "Could not delete account");
  }
  clearToken();
}

export async function scanByUrl(req: ScanUrlRequest): Promise<ScanResponse> {
  const res = await fetch(`${BASE}/scan/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function scanStream(
  req: ScanRequest,
  onEvent: (ev: ScanProgressEvent) => void
): Promise<ScanResponse> {
  const res = await fetch(`${BASE}/scan/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(req),
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || "Stream unavailable");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalScan: ScanResponse | null = null;
  let streamError: string | null = null;

  const parseBlock = (chunk: string) => {
    buffer += chunk;
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        const ev = JSON.parse(line.slice(5).trim()) as ScanProgressEvent;
        if (ev.event === "done" && ev.scan) finalScan = ev.scan;
        if (ev.event === "error") streamError = ev.detail ?? "Scan failed";
        onEvent(ev);
      } catch {
        /* ignore malformed frame */
      }
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parseBlock(decoder.decode(value, { stream: true }));
  }
  parseBlock(decoder.decode());

  if (streamError) throw new Error(streamError);
  if (!finalScan) throw new Error("Scan stream ended without a result");
  return finalScan;
}

export async function scanDependencies(req: ScanRequest): Promise<ScanResponse> {
  const res = await fetch(`${BASE}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
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
    headers: { "Content-Type": "application/json", ...authHeader() },
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
    headers: { "Content-Type": "application/json", ...authHeader() },
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
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ results, summary, fixes, project_name: projectName }),
  });
  if (!res.ok) throw new Error("Failed to save scan");
  return res.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
