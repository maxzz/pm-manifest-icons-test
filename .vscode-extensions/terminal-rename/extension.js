const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function findNearestPackageFolder(start) {
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

function activate(context) {
  const disposable = vscode.commands.registerCommand('terminal-helpers.renameNearestPackageTerminal', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor to determine package');
      return;
    }
    const fileDir = path.dirname(editor.document.uri.fsPath);
    const pkg = findNearestPackageFolder(fileDir);
    if (!pkg) {
      vscode.window.showInformationMessage('No packages/ ancestor found');
      return;
    }
    const pkgName = path.basename(pkg);
    const term = vscode.window.activeTerminal || vscode.window.createTerminal();
    term.show(true);
    await vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', { name: pkgName });
  });
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
