# Cipher VS Code Extension — Implementation Guide

## Overview

A VS Code extension that scans `package.json` files using Cipher's backend API and displays vulnerability results as inline diagnostics (red squigglies), with a status bar indicator and one-click scan command.

## Prerequisites

- Node.js 18+
- Cipher backend running locally (`uvicorn vulnchecker.main:app --port 8000`)
- VS Code + Extension Development Host (built-in)

---

## Step 1 — Scaffold

```bash
npm install -g yo generator-code
yo code
```

Select:
- **New Extension (TypeScript)**
- Name: `cipher-vscode`
- Identifier: `cipher-vscode`
- Description: `Cipher vulnerability scanner for package.json`
- Initialize git repo: Yes

---

## Step 2 — Extension entry point (`src/extension.ts`)

```typescript
import * as vscode from "vscode";

const API_BASE = "http://localhost:8000/api";

// Severity color for status bar
const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#ff4757",
  HIGH: "#ff6348",
  MEDIUM: "#ffa502",
  LOW: "#2ed573",
};

let diagnosticCollection: vscode.DiagnosticCollection;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // Create diagnostic collection
  diagnosticCollection = vscode.languages.createDiagnosticCollection("cipher");
  context.subscriptions.push(diagnosticCollection);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "cipher.scan";
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();

  // Register scan command
  const scanCommand = vscode.commands.registerCommand(
    "cipher.scan",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith("package.json")) {
        vscode.window.showWarningMessage(
          "Cipher: Open a package.json file first."
        );
        return;
      }

      const doc = editor.document;
      statusBarItem.text = "$(sync~spin) Cipher scanning...";
      statusBarItem.tooltip = "Scanning dependencies...";

      try {
        const response = await fetch(`${API_BASE}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ package_json: doc.getText() }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        const diagnostics: vscode.Diagnostic[] = [];

        for (const pkg of result.results) {
          if (pkg.vulnerabilities.length === 0) continue;

          const text = doc.getText();
          const searchKey = `"${pkg.package.name}"`;
          const idx = text.indexOf(searchKey);

          if (idx === -1) continue;

          const pos = doc.positionAt(idx);
          const range = new vscode.Range(
            pos,
            pos.translate(0, searchKey.length)
          );

          const sevMap: Record<string, vscode.DiagnosticSeverity> = {
            CRITICAL: vscode.DiagnosticSeverity.Error,
            HIGH: vscode.DiagnosticSeverity.Warning,
            MEDIUM: vscode.DiagnosticSeverity.Information,
            LOW: vscode.DiagnosticSeverity.Hint,
          };

          const diagnostic = new vscode.Diagnostic(
            range,
            `${pkg.vulnerabilities.length} vuln(s): ${pkg.vulnerabilities
              .map((v: any) => v.id)
              .join(", ")}`,
            sevMap[pkg.max_severity] ?? vscode.DiagnosticSeverity.Warning
          );

          diagnostics.push(diagnostic);
        }

        diagnosticCollection.set(doc.uri, diagnostics);

        // Update status bar
        const total = result.summary.total_vulnerabilities;
        if (total === 0) {
          statusBarItem.text = "$(check) Cipher: 0 vulns";
          statusBarItem.backgroundColor = undefined;
        } else {
          statusBarItem.text = `$(error) Cipher: ${total} vuln(s)`;
          statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground"
          );
        }
        statusBarItem.tooltip = "Click to re-scan";

        vscode.window.showInformationMessage(
          `Cipher: ${result.summary.total_packages} packages, ${total} vulnerabilities`
        );
      } catch (err: any) {
        statusBarItem.text = "$(warning) Cipher: error";
        statusBarItem.tooltip = err.message;
        vscode.window.showErrorMessage(`Cipher scan failed: ${err.message}`);
      }
    }
  );

  context.subscriptions.push(scanCommand);

  // Auto-scan on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.fileName.endsWith("package.json")) {
        vscode.commands.executeCommand("cipher.scan");
      }
    })
  );

  // Initial scan when opening a package.json
  if (
    vscode.window.activeTextEditor?.document.fileName.endsWith("package.json")
  ) {
    vscode.commands.executeCommand("cipher.scan");
  }
}

export function deactivate() {
  diagnosticCollection?.dispose();
  statusBarItem?.dispose();
}
```

---

## Step 3 — Register commands in `package.json`

Add to `contributes` in the scaffolded `package.json`:

```json
"contributes": {
  "commands": [
    {
      "command": "cipher.scan",
      "title": "Cipher: Scan Dependencies"
    }
  ],
  "keybindings": [
    {
      "command": "cipher.scan",
      "key": "ctrl+shift+c",
      "mac": "cmd+shift+c",
      "when": "editorLangId == json"
    }
  ],
  "activationEvents": [
    "onCommand:cipher.scan",
    "onLanguage:json"
  ]
}
```

Set `main` to point to the compiled output:

```json
"main": "./out/extension.js",
"engines": {
  "vscode": "^1.85.0"
},
"activationEvents": [
  "onLanguage:json",
  "onCommand:cipher.scan"
]
```

---

## Step 4 — Build & test

```bash
# In cipher-vscode/
npm install
npm run compile   # Compiles TypeScript -> out/

# Open in extension development mode
code .

# Press F5 to launch Extension Development Host
# Open any package.json -> Ctrl+Shift+C to scan
```

---

## Step 5 — Package for distribution

```bash
npm install -g @vscode/vsce
vsce package
# Produces: cipher-vscode-0.0.1.vsix
```

Install via: VS Code → Extensions → `...` → Install from VSIX...

---

## Step 6 — Publish to marketplace

```bash
# Create publisher at https://marketplace.visualstudio.com/manage
vsce login <your-publisher-name>
vsce publish
```

After ~1 hour, searchable as "Cipher" in VS Code extensions.

---

## Optional enhancements

- **Lock file support**: Add a secondary command `cipher.scanLockFile` that reads `package-lock.json` alongside `package.json` for exact version resolution
- **Webview panel**: Click a vulnerable package to open a detail panel showing CVEs, severity breakdown, fix suggestions
- **Configuration**: Add VS Code settings for API URL, auto-scan on open, min severity to highlight
- **Hover provider**: Show vulnerability count + top CVE on hover over package names
- **Code actions**: Offer quick-fix to run `npm install <package>@<safe-version>` from the diagnostic

---

## Project structure (final)

```
cipher-vscode/
├── .vscode/
│   ├── launch.json
│   └── tasks.json
├── src/
│   └── extension.ts          # Main extension code
├── package.json               # Extension manifest
├── tsconfig.json
├── .vscodeignore               # Files to exclude from package
├── README.md                   # Marketplace listing
└── CHANGELOG.md                # Version history
```
