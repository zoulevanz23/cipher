import * as vscode from "vscode";
import { getAuthState, getAuthHeader, anonymousLogin, showAccountPrompt, checkCredits, login, register, logout, AuthState } from "./auth";
import { createHoverProvider, ScanCache } from "./hover";
import { createCodeActionProvider, registerApplyFix } from "./codeActions";
import { VulnTreeProvider } from "./treeView";
import { registerAccountView } from "./accountView";
import { loadProjectRules, normalizeRules, isProjectConfigFile } from "./config";

interface Vulnerability { id: string; summary: string; severity: string; aliases?: string[]; epss_score?: number; epss_percentile?: number; }
interface ScanResult { package: { name: string; version: string; license?: string; ecosystem?: string }; vulnerabilities: Vulnerability[]; max_severity: string; health_score?: number; scan_error?: string; }
interface ScanApiResponse { results: ScanResult[]; summary: any; fixes: any[]; anonymous_credits_remaining: number; scan_status?: string; scan_errors?: any[]; sources_used?: string[]; }
type DepEntry = { name: string; version: string; line: number };

const CACHE_STATE_KEY = "vulnchecker_scan_cache_v1";
interface CachedScan { hash: string; results: ScanResult[]; fixes: any[]; scan_status?: string; scan_errors?: any[]; sources_used?: string[]; }

function parsePackageJson(text: string): DepEntry[] {
  const entries: DepEntry[] = [];
  try {
    const json = JSON.parse(text);
    const deps = { ...json.dependencies, ...json.devDependencies, ...json.peerDependencies };
    const lines = text.split("\n");
    for (const [name, ver] of Object.entries(deps)) {
      const line = lines.findIndex((l) => l.includes(`"${name}"`));
      if (line >= 0) entries.push({ name, version: String(ver), line });
    }
  } catch {}
  return entries;
}
function parseRequirementsTxt(text: string): DepEntry[] {
  const entries: DepEntry[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;
    const m = line.match(/^([a-zA-Z0-9_.-]+)\s*(==|>=|<=|!=|~=)\s*([\d.]+)/);
    if (m) entries.push({ name: m[1], version: m[3], line: i });
  }
  return entries;
}
function parseGoMod(text: string): DepEntry[] {
  const entries: DepEntry[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(/^\s*([a-zA-Z0-9_.\-/]+)\s+(v[\d.]+)/);
    if (m) entries.push({ name: m[1], version: m[2], line: i });
  }
  return entries;
}
function parseCargoToml(text: string): DepEntry[] {
  const entries: DepEntry[] = [];
  const lines = text.split("\n");
  let inDeps = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("[dependencies]")) { inDeps = true; continue; }
    if (line.startsWith("[")) { inDeps = false; continue; }
    if (!inDeps || !line || line.startsWith("#")) continue;
    const m = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
    if (m) entries.push({ name: m[1], version: m[2], line: i });
  }
  return entries;
}
function parseManifest(text: string, fileName: string): DepEntry[] {
  if (fileName === "package.json") return parsePackageJson(text);
  if (fileName === "requirements.txt") return parseRequirementsTxt(text);
  if (fileName === "go.mod") return parseGoMod(text);
  if (fileName === "Cargo.toml") return parseCargoToml(text);
  return [];
}

const ECO_MAP: Record<string, string> = { "package.json": "npm", "requirements.txt": "pypi", "go.mod": "go", "Cargo.toml": "cargo" };

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function contentHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection("vulnchecker");
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  const cfg = vscode.workspace.getConfiguration("vulnchecker");
  statusBar.text = "$(shield) VulnChecker"; statusBar.tooltip = "Click to scan"; statusBar.command = "vulnchecker.scanFile"; statusBar.show();

  const cache: ScanCache = new Map();
  const tree = new VulnTreeProvider();
  vscode.window.createTreeView("vulnchecker.vulns", { treeDataProvider: tree, showCollapseAll: true });

  let authState: AuthState = { token: undefined, userId: undefined, email: undefined, isAnonymous: true, creditsRemaining: 0 };

  async function initAuth() {
    const tok = await context.secrets.get("vulnchecker_token");
    const uid = context.globalState.get<number>("vulnchecker_user_id");
    const isAnon = context.globalState.get<boolean>("vulnchecker_is_anonymous", true);
    if (tok && uid && !isAnon) authState = await getAuthState(context);
    else { await anonymousLogin(context); authState = await getAuthState(context); }
    updateStatusBar();
  }
  initAuth();

  function updateStatusBar() {
    if (authState.isAnonymous) {
      const c = authState.creditsRemaining;
      statusBar.text = c > 0 ? `$(shield) VulnChecker (${c}/5)` : `$(shield) VulnChecker ✗`;
      statusBar.tooltip = c > 0 ? `${c} scans left — create account for unlimited` : "No scans left — create account";
      statusBar.backgroundColor = c <= 0 ? new vscode.ThemeColor("statusBarItem.warningBackground") : undefined;
    } else { statusBar.text = `$(shield) VulnChecker`; statusBar.tooltip = `Signed in as ${authState.email} — unlimited`; statusBar.backgroundColor = undefined; }
  }
  const onAuthChanged = async () => { authState = await getAuthState(context); updateStatusBar(); };

  // Hover + CodeAction providers (json, toml, python, go)
  const sel = [{ language: "json", scheme: "file" }, { language: "toml", scheme: "file" }, { language: "python", scheme: "file" }, { language: "go", scheme: "file" }];
  context.subscriptions.push(vscode.languages.registerHoverProvider(sel, createHoverProvider(cache)));
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider(sel, createCodeActionProvider(cache), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
  context.subscriptions.push(registerApplyFix(context, cache));
  context.subscriptions.push(registerAccountView(context, onAuthChanged));

  const lastHashes = new Map<string, string>();
let minSevLevel = 1;

  function applyResults(document: vscode.TextDocument, data: ScanApiResponse, entries: DepEntry[], uriKey: string): void {
    cache.set(uriKey, { results: data.results, fixes: data.fixes ?? [] });
    const diagnostics: vscode.Diagnostic[] = [];
    const lineMap = new Map<string, number>();
    for (const e of entries) lineMap.set(e.name, e.line);
    tree.refresh(data.results as any, document.uri, lineMap);
    vscode.commands.executeCommand("setContext", "vulnchecker:hasVulns", data.results.some((r) => r.vulnerabilities.length > 0));
    for (const result of data.results) {
      if (result.vulnerabilities.length === 0) continue;
      const entry = entries.find((e) => e.name === result.package.name); if (!entry) continue;
      for (const vuln of result.vulnerabilities) {
        const sevLevel = SEV_ORDER[(vuln.severity as string).toLowerCase()] ?? 0; if (sevLevel < minSevLevel) continue;
        const line = document.lineAt(entry.line);
        const col = line.text.indexOf(`"${entry.name}"`);
        const range = col >= 0 ? new vscode.Range(entry.line, col, entry.line, col + entry.name.length + 2) : new vscode.Range(entry.line, 0, entry.line, line.text.length);
        const sm: Record<string, vscode.DiagnosticSeverity> = { CRITICAL: vscode.DiagnosticSeverity.Error, HIGH: vscode.DiagnosticSeverity.Error, MEDIUM: vscode.DiagnosticSeverity.Warning, LOW: vscode.DiagnosticSeverity.Information };
        const diag = new vscode.Diagnostic(range, `[${vuln.severity}] ${vuln.id}: ${vuln.summary.slice(0, 120)}`, (sm as any)[vuln.severity] ?? vscode.DiagnosticSeverity.Warning);
        diag.code = vuln.id; diag.source = "VulnChecker"; diagnostics.push(diag);
      }
    }
    diagnosticCollection.set(document.uri, diagnostics);
    const status = data.scan_status ?? "ok";
    if (status === "ok") {
      statusBar.text = `$(shield) VulnChecker${diagnostics.length ? ` $(warning) ${diagnostics.length}` : ""}`;
      statusBar.tooltip = diagnostics.length ? `${diagnostics.length} vulnerability(ies) found in ${document.fileName.split(/[/\\]/).pop()}` : "No vulnerabilities found";
      statusBar.backgroundColor = undefined;
    } else {
      const errors = (data.scan_errors ?? []) as any[];
      statusBar.text = `$(shield) VulnChecker $(warning) ${status}`;
      statusBar.tooltip = `Scan status: ${status}\n${errors.map((e: any) => `${e.package ?? ""}@${e.version ?? ""} ${e.error ?? e}`).join("\n")}`;
      statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    }
  }

  async function persistScan(uriKey: string, hash: string, data: ScanApiResponse): Promise<void> {
    const all = context.globalState.get<Record<string, CachedScan>>(CACHE_STATE_KEY, {});
    all[uriKey] = {
      hash,
      results: data.results,
      fixes: data.fixes ?? [],
      scan_status: data.scan_status,
      scan_errors: data.scan_errors ?? [],
      sources_used: data.sources_used ?? [],
    };
    const keys = Object.keys(all);
    while (keys.length > 200) delete all[keys.shift() as string];
    await context.globalState.update(CACHE_STATE_KEY, all);
  }

  function tryRestore(document: vscode.TextDocument, uriKey: string, hash: string, entries: DepEntry[]): boolean {
    const all = context.globalState.get<Record<string, CachedScan>>(CACHE_STATE_KEY, {});
    const rec = all[uriKey];
    if (!rec || rec.hash !== hash) return false;
    const rules = normalizeRules(loadProjectRules(document.uri) as unknown as Record<string, unknown>);
    const sev = (rules.min_severity ?? cfg.get<string>("minSeverity", "low") ?? "low").toLowerCase();
    minSevLevel = SEV_ORDER[sev] ?? 1;
    lastHashes.set(uriKey, hash);
    applyResults(document, rec as unknown as ScanApiResponse, entries, uriKey);
    return true;
  }

  async function scanDocument(document: vscode.TextDocument): Promise<void> {
    if (!cfg.get<boolean>("enable", true)) return;
    if (authState.isAnonymous && authState.creditsRemaining <= 0) { await showAccountPrompt(context); return; }
    const fileName = document.fileName.split(/[/\\]/).pop() || "";
    const text = document.getText();
    const uriKey = document.uri.toString();
    const ecosystem = ECO_MAP[fileName]; if (!ecosystem) return;
    const entries = parseManifest(text, fileName);
    if (entries.length === 0) { diagnosticCollection.set(document.uri, undefined); cache.delete(uriKey); tree.clear(); vscode.commands.executeCommand("setContext", "vulnchecker:hasVulns", false); return; }
    const hash = contentHash(text);
    if (lastHashes.get(uriKey) === hash) {
      if (!cache.has(uriKey) && tryRestore(document, uriKey, hash, entries)) return;
      return;
    }
    const rules = normalizeRules(loadProjectRules(document.uri) as unknown as Record<string, unknown>);
    const minSevRaw = (rules.min_severity ?? cfg.get<string>("minSeverity", "low") ?? "low").toLowerCase();
    minSevLevel = SEV_ORDER[minSevRaw] ?? 1;
    statusBar.text = "$(sync~spin) VulnChecker scanning...";
    const serverUrl = cfg.get<string>("serverUrl", "http://localhost:8000");
    const authHeader = await getAuthHeader(context);
    const headers: Record<string, string> = { "Content-Type": "application/json" }; if (authHeader) headers["Authorization"] = authHeader;
    const packages = entries.map((e) => ({ name: e.name, version: e.version }));
    const packageJsonStr = ecosystem === "npm" ? JSON.stringify({ dependencies: Object.fromEntries(packages.map((p) => [p.name, p.version])) }) : JSON.stringify(packages);
    const body: Record<string, unknown> = { package_json: packageJsonStr, ecosystem };
    body.min_severity = minSevRaw;
    if (rules.ignore?.length) body.ignore = rules.ignore;
    if (rules.ignore_until && Object.keys(rules.ignore_until).length) body.ignore_until = rules.ignore_until;
    try {
      const resp = await fetch(`${serverUrl}/api/scan`, { method: "POST", headers, body: JSON.stringify(body) });
      if (resp.status === 429) { authState.isAnonymous = true; authState.creditsRemaining = 0; updateStatusBar(); await showAccountPrompt(context); diagnosticCollection.set(document.uri, undefined); return; }
      if (!resp.ok) { const e = await resp.json().catch(() => ({} as any)); throw new Error((e as any).detail || `API ${resp.status}`); }
      const data: ScanApiResponse = await resp.json() as any;
      if (data.anonymous_credits_remaining !== undefined) { authState.creditsRemaining = data.anonymous_credits_remaining; await context.globalState.update("vulnchecker_credits", data.anonymous_credits_remaining); updateStatusBar(); }
      lastHashes.set(uriKey, hash);
      applyResults(document, data, entries, uriKey);
      await persistScan(uriKey, hash, data);
      if (data.scan_status && data.scan_status !== "ok") {
        const n = (data.scan_errors ?? []).length;
        const a = await vscode.window.showWarningMessage(`VulnChecker: scan of ${fileName} finished with status "${data.scan_status}" (${n} error(s))`, "View Details");
        if (a === "View Details") vscode.commands.executeCommand("vulnchecker.openResults");
      } else if (diagnosticCollection.get(document.uri)?.length ?? 0 > 0) {
        const a = await vscode.window.showWarningMessage(`VulnChecker found ${diagnosticCollection.get(document.uri)!.length} vuln(s) in ${fileName}`, "View Details");
        if (a === "View Details") vscode.commands.executeCommand("vulnchecker.openResults");
      }
    } catch (err: any) { statusBar.text = "$(warning) VulnChecker: error"; statusBar.tooltip = err.message; }
  }

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((doc) => scanDocument(doc)));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => { const t = setTimeout(() => scanDocument(event.document), 1500); context.subscriptions.push({ dispose: () => clearTimeout(t) }); }));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => {
    const name = doc.fileName.split(/[/\\]/).pop() || "";
    if (isProjectConfigFile(name)) {
      for (const td of vscode.workspace.textDocuments) {
        const fn = td.fileName.split(/[/\\]/).pop() || "";
        if (!ECO_MAP[fn]) continue;
        lastHashes.delete(td.uri.toString());
        scanDocument(td);
      }
    } else if (name === "package.json" && cfg.get<boolean>("scanOnSave", true)) {
      scanDocument(doc);
    }
  }));
  if (vscode.window.activeTextEditor) scanDocument(vscode.window.activeTextEditor.document);

  context.subscriptions.push(vscode.commands.registerCommand("vulnchecker.scanFile", () => { const ed = vscode.window.activeTextEditor; if (ed) scanDocument(ed.document); }));
  context.subscriptions.push(vscode.commands.registerCommand("vulnchecker.clearDiagnostics", () => { diagnosticCollection.clear(); cache.clear(); tree.clear(); vscode.commands.executeCommand("setContext", "vulnchecker:hasVulns", false); statusBar.text = "$(shield) VulnChecker"; }));
  context.subscriptions.push(vscode.commands.registerCommand("vulnchecker.openResults", async () => {
    const uri = vscode.window.activeTextEditor?.document.uri; if (!uri) return;
    const all = diagnosticCollection.get(uri); if (!all || all.length === 0) { vscode.window.showInformationMessage("No vulnerabilities found."); return; }
    const panel = vscode.window.createWebviewPanel("vulncheckerResults", "VulnChecker Results", vscode.ViewColumn.Beside, {});
    const rows = all.map((d) => { const sev = d.severity === vscode.DiagnosticSeverity.Error ? "🔴" : d.severity === vscode.DiagnosticSeverity.Warning ? "🟡" : "🔵"; return `<tr><td>${sev}</td><td><code>${d.code || ""}</code></td><td>${d.message}</td></tr>`; }).join("\n");
    panel.webview.html = `<!DOCTYPE html><html><body style="font-family:monospace;padding:1rem;background:#0f0f12;color:#ccc;"><h2 style="color:#00ff41;">VulnChecker Results</h2><table style="width:100%;border-collapse:collapse;"><thead><tr style="text-align:left;border-bottom:1px solid #333;"><th>Sev</th><th>ID</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  }));
  context.subscriptions.push(vscode.commands.registerCommand("vulnchecker.login", async () => {
    const email = await vscode.window.showInputBox({ prompt: "Email", placeHolder: "you@example.com" }); if (!email) return;
    const pw = await vscode.window.showInputBox({ prompt: "Password", password: true }); if (!pw) return;
    const r = await login(context, email, pw); if (r.success) { authState = await getAuthState(context); updateStatusBar(); vscode.window.showInformationMessage("Signed in — unlimited scans."); } else vscode.window.showErrorMessage(`Login failed: ${r.error}`);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("vulnchecker.register", async () => {
    const email = await vscode.window.showInputBox({ prompt: "Email", placeHolder: "you@example.com" }); if (!email) return;
    const pw = await vscode.window.showInputBox({ prompt: "Password (min 8 chars)", password: true }); if (!pw) return;
    const r = await register(context, email, pw); if (r.success) { authState = await getAuthState(context); updateStatusBar(); vscode.window.showInformationMessage("Account created — unlimited scans."); } else vscode.window.showErrorMessage(`Register failed: ${r.error}`);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("vulnchecker.logout", async () => { await logout(context); await anonymousLogin(context); authState = await getAuthState(context); updateStatusBar(); vscode.window.showInformationMessage("Signed out — anonymous mode."); }));
  context.subscriptions.push(vscode.commands.registerCommand("vulnchecker.showAccount", async () => {
    const credits = await checkCredits(context); const st = await getAuthState(context);
    const msg = st.isAnonymous ? `Anonymous — ${credits.credits}/${credits.limit} scans left` : `Signed in as ${authState.email} — unlimited`;
    vscode.window.showInformationMessage(msg);
  }));

  context.subscriptions.push(diagnosticCollection, statusBar);
}
export function deactivate() {}
