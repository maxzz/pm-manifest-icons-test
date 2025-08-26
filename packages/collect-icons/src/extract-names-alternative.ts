import path from 'path';
import ts from 'typescript';

/**
 * Simple fallback that parses a single file when Program is not used
 * @param sourceText - file contents
 * @param filename - file name w/ path like 'path/file.ts'
 * @param prefixes - list of name prefixes to detect (default: ['SvgSymbol','Symbol'])
 * @returns list of detected names
 */
export function extractNamesFromFile(sourceText: string, filename: string, prefixes: string[]): string[] {
    const names = new Set<string>();
    const ext = path.extname(filename).toLowerCase();
    const kind = ext === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.ESNext, true, kind);

    function addIfMatches(name?: ts.Identifier) {
        if (!name) return;
        const n = name.text;
        for (const p of prefixes) {
            if (n.startsWith(p)) {
                names.add(n);
                break;
            }
        }
    }

    function visit(node: ts.Node) {
        if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.modifiers) {
            const isExported = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
            if (isExported) {
                addIfMatches((node as any).name);
            }
        }

        if (ts.isVariableStatement(node) && node.modifiers) {
            const isExported = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
            if (isExported) {
                for (const decl of node.declarationList.declarations) {
                    if (ts.isIdentifier(decl.name)) {
                        addIfMatches(decl.name);
                    }
                }
            }
        }

        if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
            for (const spec of node.exportClause.elements) {
                const exportedName = spec.name.text;
                for (const p of prefixes) {
                    if (exportedName.startsWith(p)) {
                        names.add(exportedName);
                        break;
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sf);

    return Array.from(names);
}
