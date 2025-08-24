import fg from 'fast-glob';
import { Plugin } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import ts from 'typescript';

function createLogger(verbose: boolean) {
  function format(level: 'info' | 'debug' | 'warn' | 'error', msg: string, obj?: any) {
    const out: any = { ts: new Date().toISOString(), level, msg };
    if (obj) out.data = obj;
    return JSON.stringify(out);
  }

  return {
    info: (msg: string, obj?: any) => console.log(format('info', msg, obj)),
    debug: (msg: string, obj?: any) => {
      if (verbose) console.log(format('debug', msg, obj));
    },
    warn: (msg: string, obj?: any) => console.warn(format('warn', msg, obj)),
    error: (msg: string, obj?: any) => console.error(format('error', msg, obj)),
  };
}

export interface CollectIconsOptions {
  srcDir?: string; // absolute or relative to process.cwd()
  outFile?: string; // output TypeScript file path (will be created)
  verbose?: boolean; // print debug info
  exportFolderName?: string; // optional folder name to make exports relative to (e.g. 'app' -> 'app/..')
  bareImports?: boolean; // if true, emit bare module specifiers starting at exportFolderName (e.g. 'app/...'). If false, emit './app/...'
}

function extractNames(contents: string, fileName = 'file.ts'): string[] {
  const names = new Set<string>();

  const ext = path.extname(fileName).toLowerCase();
  const kind = ext === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, contents, ts.ScriptTarget.ESNext, true, kind);

  function addIfMatches(name?: ts.Identifier) {
    if (!name) return;
    const n = name.text;
    if (n.startsWith('SvgSymbol') || n.startsWith('Symbol')) names.add(n);
  }

  function visit(node: ts.Node) {
    // exported function or class declarations: export function Foo() {}, export class Foo {}
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.modifiers) {
      const isExported = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) addIfMatches((node as any).name);
    }

    // exported variables: export const Foo = ...
    if (ts.isVariableStatement(node) && node.modifiers) {
      const isExported = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) addIfMatches(decl.name);
        }
      }
    }

    // export { A, B as C } from '...'  OR export { A, B }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const spec of node.exportClause.elements) {
        const exportedName = spec.name.text;
        if (exportedName.startsWith('SvgSymbol') || exportedName.startsWith('Symbol')) names.add(exportedName);
      }
    }

    // export default X (not handled) or export assignment - ignore

    ts.forEachChild(node, visit);
  }

  visit(sf);

  return Array.from(names);
}
export async function collectIcons(opts: CollectIconsOptions = {}) {
  const srcDir = opts.srcDir || 'packages/app/src/components/ui/icons/symbols/all-other';
  const outFile = opts.outFile || 'packages/collect-icons/generated/collected-icons.ts';

  const base = path.isAbsolute(srcDir) ? srcDir : path.resolve(process.cwd(), srcDir);
  const entries = await fg(['**/*.{tsx,ts,jsx,js,svg}'], { cwd: base, absolute: true });

  const dest = path.isAbsolute(outFile) ? outFile : path.resolve(process.cwd(), outFile);
  const destDir = path.dirname(dest);
  await fs.mkdir(destDir, { recursive: true });

  const groups: Record<string, string[]> = {};
  const allNames: string[] = [];

  for (const file of entries) {
    const contents = await fs.readFile(file, 'utf8');
    const names = extractNames(contents);
    if (names.length === 0) continue;

    let importPath: string;
    if (opts.exportFolderName) {
      const parts = file.split(/[/\\]+/);
      const idx = parts.indexOf(opts.exportFolderName);
      if (idx >= 0) {
        const relParts = parts.slice(idx);
        const baseSpec = relParts.join('/').replace(/\.(tsx|ts|jsx|js|svg)$/, '');
        if (opts.bareImports) {
          // emit bare import specifier starting at the folder name
          importPath = baseSpec;
        } else {
          // emit a './' prefixed specifier (./app/...) so it isn't a bare package specifier
          importPath = './' + baseSpec;
        }
      } else {
        const relImportPath = path.relative(destDir, file).replace(/\\+/g, '/').replace(/\.(tsx|ts|jsx|js|svg)$/, '');
        importPath = relImportPath.startsWith('.') ? relImportPath : './' + relImportPath;
      }
    } else {
      const relImportPath = path.relative(destDir, file).replace(/\\+/g, '/').replace(/\.(tsx|ts|jsx|js|svg)$/, '');
      importPath = relImportPath.startsWith('.') ? relImportPath : './' + relImportPath;
    }
    groups[importPath] = groups[importPath] || [];
    groups[importPath].push(...names);
    allNames.push(...names);
  }

  // deduplicate names
  const uniqueNames = Array.from(new Set(allNames)).sort();

  // generate TS file that re-exports symbols and provides a names array + union type
  const lines: string[] = [];
  lines.push('// Auto-generated by vite-plugin-collect-icons. Do not edit.');
  lines.push('/* eslint-disable */');
  lines.push('');
  // re-exports
  for (const [importPath, names] of Object.entries(groups)) {
    const unique = Array.from(new Set(names)).sort();
    lines.push(`export { ${unique.join(', ')} } from '${importPath}';`);
  }
  lines.push('');
  // names array and type
  lines.push(`export const collectedIconNames = [${uniqueNames.map(n => `'${n}'`).join(', ')}] as const;`);
  lines.push('export type CollectedIconName = typeof collectedIconNames[number];');

  await fs.writeFile(dest, lines.join('\n'), 'utf8');

  // Structured logging
  const logger = createLogger(!!opts.verbose);
  logger.info('collected', { count: uniqueNames.length, dest });
  if (opts.verbose) {
    logger.debug('files', { files: entries });
    logger.debug('names', { names: uniqueNames });
  }

  return { dest, names: uniqueNames };
}

export default function collectIconsPlugin(opts: CollectIconsOptions = {}): Plugin {
  return {
    name: 'vite-plugin-collect-icons',
    apply: 'build',
    async buildStart() {
      await collectIcons(opts);
    }
  };
}
