import * as vscode from "vscode";
import { getAuthHeader } from "./auth";

export class VulnerabilityTreeProvider implements vscode.TreeDataProvider<VulnerabilityItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<VulnerabilityItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private vulnerabilities: any[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: VulnerabilityItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: VulnerabilityItem): Thenable<VulnerabilityItem[]> {
    if (!element) {
      return Promise.resolve(this.vulnerabilities.map(v => new VulnerabilityItem(v.id, vscode.TreeItemCollapsibleState.None)));
    }
    return Promise.resolve([]);
  }

  setVulnerabilities(vulns: any[]) {
    this.vulnerabilities = vulns;
    this.refresh();
  }
}

class VulnerabilityItem extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(id, collapsibleState);
    this.tooltip = `Vulnerability: ${id}`;
    this.description = id;
  }
}
