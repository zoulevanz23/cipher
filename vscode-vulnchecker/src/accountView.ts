import * as vscode from "vscode";
import { getAuthState, logout, checkCredits, getServerUrl } from "./auth";

export class AccountViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    this.updateContent();
  }

  private async updateContent() {
    if (!this._view) return;

    const state = await getAuthState(vscode.extensions.getExtension("zoulevanz23.vulnchecker")!.extensionUri as any);
    const credits = await checkCredits(vscode.extensions.getExtension("zoulevanz23.vulnchecker")!.extensionUri as any);
    const serverUrl = getServerUrl(vscode.extensions.getExtension("zoulevanz23.vulnchecker")!.extensionUri as any);

    this._view.webview.html = this._getHtmlForWebview(this._view.webview, state, credits, serverUrl);
  }

  private _getHtmlForWebview(webview: vscode.Webview, state?: any, credits?: any, serverUrl?: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-foreground); }
    .section { margin-bottom: 15px; }
    .label { font-weight: bold; margin-bottom: 5px; }
    .value { margin-bottom: 10px; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 5px 10px; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <div class="section">
    <div class="label">Server URL</div>
    <div class="value">${serverUrl || "http://localhost:8000"}</div>
  </div>
  ${state?.email ? `
    <div class="section">
      <div class="label">Email</div>
      <div class="value">${state.email}</div>
    </div>
  ` : ''}
  <div class="section">
    <div class="label">Credits</div>
    <div class="value">${credits?.credits || 0} / ${credits?.limit === Infinity ? "Unlimited" : credits?.limit || 5}</div>
  </div>
  ${state?.token ? `
    <button onclick="logout()">Sign Out</button>
  ` : ''}
  <script>
    const vscode = acquireVsCodeApi();
    function logout() {
      vscode.postMessage({ command: 'logout' });
    }
  </script>
</body>
</html>`;
  }
}
