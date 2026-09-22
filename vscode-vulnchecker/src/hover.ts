import * as vscode from "vscode";
import { getAuthHeader } from "./auth";

export class VulnCheckerHoverProvider implements vscode.HoverProvider {
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return undefined;

    const word = document.getText(range);
    
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown(`**Package: ${word}**\n\n`);
    markdown.appendMarkdown(`Click to check for vulnerabilities.\n\n`);
    markdown.appendMarkdown(`[Scan Package](command:vulnchecker.scanPackage?${encodeURIComponent(JSON.stringify([word]))})`);

    return new vscode.Hover(markdown, range);
  }
}
