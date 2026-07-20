import * as vscode from "vscode";

// ── Types ──

interface Vulnerability {
  id: string;
  summary: string;
  severity: string;
}

interface ScanResult {
  package: { name: string; version: string };
  vulnerabilities: Vulnerability[];
  max_severity: string;
}

interface ScanApiResponse {
  results: ScanResult[];
  summary: {
    total_packages: number;
    vulnerable_packages: number;
    total_vulnerabilities: number;
  };
}

// ── Manifest Parsers ──

type DepEntry = { name: string; version: string; line: number };

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
    const match = line.match(/^([a-zA-Z0-9_.-]+)\s*(==|>=|<=|!=|~=)\s*([\d.]+)/);
    if (match) entries.push({ name: match[1], version: match[3], line: i });
  }
  return entries;
}

function parseGoMod(text: string): DepEntry[] {
  const entries: DepEntry[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^\s*([a-zA-Z0-9_.-/]+)\s+(v[\d.]+)/);
    if (match) entries.push({ name: match[1], version: match[2], line: i });
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
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
    if (match) entries.push({ name: match[1], version: match[2], line: i });
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

// ── API Client ──

async function scanDependencies(
  entries: DepEntry[],
  serverUrl: string,
  ecosystem: string
): Promise<ScanResult[]> {
  const packages = entries.map((e) => ({ name: e.name, version: e.version }));

  let packageJsonStr: string | undefined;
  let ecosystemParam = ecosystem;
  if (ecosystem === "npm") {
    packageJsonStr = JSON.stringify({
      dependencies: Object.fromEntries(packages.map((p) => [p.name, p.version])),
    });
  } else {
    packageJsonStr = JSON.stringify(packages);
  }

  const body = {
    package_json: packageJsonStr,
    ecosystem: ecosystemParam,
  };

  try {
    const resp = await fetch(`${serverUrl}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return [];
    const data: ScanApiResponse = await resp.json();
    return data.results;
  } catch {
    return [];
  }
}

// ── Severity helpers ──

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function sevColor(sev: string): string {
  switch (sev) {
    case "CRITICAL": return new vscode.ThemeColor("editorError.foreground").toString();
    case "HIGH": return new vscode.ThemeColor("editorWarning.foreground").toString();
    case "MEDIUM": return new vscode.ThemeColor("editorInfo.foreground").toString();
    default: return new vscode.ThemeColor("foreground").toString();
  }
}

// ── Extension Activation ──

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection("vulnchecker");
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = "$(shield) VulnChecker";
  statusBar.tooltip = "Click to scan current file";
  statusBar.command = "vulnchecker.scanFile";
  statusBar.show();

  context.subscriptions.push(diagnosticCollection, statusBar);

  // ── Scan function ──
  async function scanDocument(document: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration("vulnchecker");
    if (!config.get<boolean>("enable", true)) return;

    const fileName = document.fileName.split(/[/\\]/).pop() || "";
    const text = document.getText();

    // Determine ecosystem from file name
    const ecoMap: Record<string, string> = {
      "package.json": "npm",
      "requirements.txt": "pypi",
      "go.mod": "go",
      "Cargo.toml": "cargo",
    };
    const ecosystem = ecoMap[fileName];
    if (!ecosystem) return;

    const entries = parseManifest(text, fileName);
    if (entries.length === 0) {
      diagnosticCollection.set(document.uri, undefined);
      return;
    }

    statusBar.text = "$(sync~spin) VulnChecker scanning...";

    const serverUrl = config.get<string>("serverUrl", "http://localhost:8000");
    const minSeverity = config.get<string>("minSeverity", "low");
    const minSevLevel = SEV_ORDER[minSeverity] ?? 1;

    const results = await scanDependencies(entries, serverUrl, ecosystem);

    const diagnostics: vscode.Diagnostic[] = [];

    for (const result of results) {
      if (result.vulnerabilities.length === 0) continue;

      // Find the matching entry
      const entry = entries.find((e) => e.name === result.package.name);
      if (!entry) continue;

      for (const vuln of result.vulnerabilities) {
        const sevLevel = SEV_ORDER[vuln.severity.toLowerCase()] ?? 0;
        if (sevLevel < minSevLevel) continue;

        const line = document.lineAt(entry.line);
        const col = line.text.indexOf(`"${entry.name}"`);
        const range = col >= 0
          ? new vscode.Range(entry.line, col, entry.line, col + entry.name.length + 2)
          : new vscode.Range(entry.line, 0, entry.line, line.text.length);

        const severityMap: Record<string, vscode.DiagnosticSeverity> = {
          CRITICAL: vscode.DiagnosticSeverity.Error,
          HIGH: vscode.DiagnosticSeverity.Error,
          MEDIUM: vscode.DiagnosticSeverity.Warning,
          LOW: vscode.DiagnosticSeverity.Information,
        };

        const diag = new vscode.Diagnostic(
          range,
          `[${vuln.severity}] ${vuln.id}: ${vuln.summary.slice(0, 120)}`,
          severityMap[vuln.severity] ?? vscode.DiagnosticSeverity.Warning
        );
        diag.code = vuln.id;
        diag.source = "VulnChecker";
        diagnostics.push(diag);
      }
    }

    diagnosticCollection.set(document.uri, diagnostics);
    statusBar.text = `$(shield) VulnChecker${diagnostics.length > 0 ? ` $(warning) ${diagnostics.length}` : ""}`;

    // Show notification for new vulnerabilities
    const vulnCount = diagnostics.length;
    if (vulnCount > 0) {
      const action = await vscode.window.showWarningMessage(
        `VulnChecker found ${vulnCount} vulnerabilit${vulnCount === 1 ? "y" : "ies"} in ${fileName}`,
        "View Details"
      );
      if (action === "View Details") {
        vscode.commands.executeCommand("vulnchecker.openResults");
      }
    }
  }

  // ── Event listeners ──
  const openHandler = vscode.workspace.onDidOpenTextDocument((doc) => {
    scanDocument(doc);
  });

  const saveHandler = vscode.workspace.onDidSaveTextDocument((doc) => {
    scanDocument(doc);
  });

  const changeHandler = vscode.workspace.onDidChangeTextDocument((event) => {
    // Debounce: scan 1.5s after user stops typing
    const timer = setTimeout(() => {
      scanDocument(event.document);
    }, 1500);
    context.subscriptions.push({ dispose: () => clearTimeout(timer) });
  });

  context.subscriptions.push(openHandler, saveHandler, changeHandler);

  // Scan active editor on activation
  if (vscode.window.activeTextEditor) {
    scanDocument(vscode.window.activeTextEditor.document);
  }

  // ── Commands ──
  context.subscriptions.push(
    vscode.commands.registerCommand("vulnchecker.scanFile", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) scanDocument(editor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vulnchecker.clearDiagnostics", () => {
      diagnosticCollection.clear();
      statusBar.text = "$(shield) VulnChecker";
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vulnchecker.openResults", () => {
      // Build markdown for results panel
      const allDiagnostics = diagnosticCollection.get(vscode.window.activeTextEditor?.document.uri);
      if (!allDiagnostics || allDiagnostics.length === 0) {
        vscode.window.showInformationMessage("No vulnerabilities found by VulnChecker.");
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "vulncheckerResults",
        "VulnChecker Results",
        vscode.ViewColumn.Beside,
        {}
      );

      const rows = allDiagnostics
        .map((d) => {
          const sev = d.severity === vscode.DiagnosticSeverity.Error ? "🔴" :
                      d.severity === vscode.DiagnosticSeverity.Warning ? "🟡" : "🔵";
          return `<tr><td>${sev}</td><td><code>${d.code || ""}</code></td><td>${d.message}</td></tr>`;
        })
        .join("\n");

      panel.webview.html = `<!DOCTYPE html>
<html><body style="font-family: monospace; padding: 1rem; background: #0f0f12; color: #ccc;">
<h2 style="color: #00ff41;">VulnChecker Results</h2>
<table style="width:100%; border-collapse: collapse;">
<thead><tr style="text-align:left; border-bottom: 1px solid #333;">
<th>Sev</th><th>ID</th><th>Message</th>
</tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
    })
  );
}

export function deactivate() {}
