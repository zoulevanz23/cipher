import * as vscode from "vscode";
import { getAuthHeader } from "./auth";

export class VulnCheckerCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const codeActions: vscode.CodeAction[] = [];

    const fixAction = new vscode.CodeAction(
      "Fix vulnerability",
      vscode.CodeActionKind.QuickFix
    );
    fixAction.command = {
      command: "vulnchecker.fixVulnerability",
      title: "Fix vulnerability",
      tooltip: "Update package to secure version",
    };
    codeActions.push(fixAction);

    return codeActions;
  }
}
