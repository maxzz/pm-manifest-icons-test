import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

function findNearestPackageFolder(start: string): string | null {
  let cur = path.resolve(start);
  while (true) {
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    const parts = cur.split(path.sep);
    const idx = parts.lastIndexOf('packages');
    if (idx !== -1 && idx < parts.length - 1) {
      const pkgPath = parts.slice(0, idx + 2).join(path.sep);
      if (fs.existsSync(pkgPath)) return pkgPath;
    }
    cur = parent;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('myext.renameTerminalToNearestPackage', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor');
      return;
    }
    const fileDir = path.dirname(editor.document.uri.fsPath);
    const pkg = findNearestPackageFolder(fileDir);
    if (!pkg) {
      vscode.window.showInformationMessage('No packages/ ancestor found');
      return;
    }
    const pkgName = path.basename(pkg);
    // ensure a terminal exists and is shown
    const term = vscode.window.activeTerminal ?? vscode.window.createTerminal();
    term.show(true);
    // use the built-in rename command which accepts an arg
    await vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', { name: pkgName });
  });

  context.subscriptions.push(disposable);
}