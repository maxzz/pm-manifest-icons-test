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
  bareImportsMode?: 'bare' | 'prefixed' | 'absolute'; // 'bare' => app/..., 'prefixed' => ./app/..., 'absolute' => /app/...
}

function extractNames(contents: string, fileName = 'file.ts'): string[] {
  // simple fallback that parses a single file when Program is not used
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
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.modifiers) {
      const isExported = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) addIfMatches((node as any).name);
    }

    if (ts.isVariableStatement(node) && node.modifiers) {
      const isExported = node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) addIfMatches(decl.name);
        }
      }
    }

    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const spec of node.exportClause.elements) {
        const exportedName = spec.name.text;
        if (exportedName.startsWith('SvgSymbol') || exportedName.startsWith('Symbol')) names.add(exportedName);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  return Array.from(names);
}

async function collectNamesWithProgram(rootDir: string) {
  // collect all TS/TSX/JS files under rootDir
  const files = await fg(['**/*.{ts,tsx,js,jsx,mjs,cjs}'], { cwd: rootDir, absolute: true });
  const compilerOptions: ts.CompilerOptions = { allowJs: true, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext, moduleResolution: ts.ModuleResolutionKind.NodeJs, baseUrl: process.cwd() };
  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram(files, compilerOptions, host);

  const normalizedRoot = path.normalize(rootDir).toLowerCase();
  const sourceFileMap = new Map(program.getSourceFiles().map(sf => [path.normalize(sf.fileName), sf] as const));

  // First pass: collect direct exports from each source file (declarations and export { A, B })
  const directExports = new Map<string, string[]>();
  for (const sf of program.getSourceFiles()) {
    const nf = path.normalize(sf.fileName).toLowerCase();
    if (!nf.startsWith(normalizedRoot)) continue;
    const names: string[] = [];
    function addIf(id?: ts.Identifier) {
      if (!id) return;
      const n = id.text;
      if (n.startsWith('SvgSymbol') || n.startsWith('Symbol')) names.push(n);
    }
    for (const stmt of sf.statements) {
      if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && stmt.modifiers) {
        if (stmt.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) addIf((stmt as any).name);
      }
      if (ts.isVariableStatement(stmt) && stmt.modifiers) {
        if (stmt.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          for (const decl of stmt.declarationList.declarations) if (ts.isIdentifier(decl.name)) addIf(decl.name);
        }
      }
      if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause) && !stmt.moduleSpecifier) {
        for (const el of stmt.exportClause.elements) {
          if (ts.isIdentifier(el.name)) addIf(el.name);
        }
      }
    }
    if (names.length > 0) directExports.set(sf.fileName, Array.from(new Set(names)));
  }

  // Resolve re-exports transitively using module resolution
  const cache = new Map<string, string[]>();
  function resolveExports(fileName: string): string[] {
    if (cache.has(fileName)) return cache.get(fileName)!;
    const result = new Set<string>();
    const sf = sourceFileMap.get(fileName);
    if (!sf) {
      cache.set(fileName, []);
      return [];
    }
    // add direct exports
    const direct = directExports.get(fileName) || [];
    for (const n of direct) result.add(n);

    // process export declarations with moduleSpecifier
    for (const stmt of sf.statements) {
      if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) {
        const ms = (stmt.moduleSpecifier as ts.StringLiteral).text;
        const resolved = ts.resolveModuleName(ms, fileName, compilerOptions, ts.sys);
        if (resolved && resolved.resolvedModule && resolved.resolvedModule.resolvedFileName) {
          const target = resolved.resolvedModule.resolvedFileName;
          // if named exports are specified, include only those names
          if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
            for (const el of stmt.exportClause.elements) {
              const nm = el.name.text;
              if (nm.startsWith('SvgSymbol') || nm.startsWith('Symbol')) result.add(nm);
            }
          } else {
            // re-export all exported names from target
            const childNames = resolveExports(target);
            for (const n of childNames) result.add(n);
          }
        }
      }
    }

    const arr = Array.from(result);
    cache.set(fileName, arr);
    return arr;
  }

  const exportedNames = new Map<string, string[]>();
  for (const file of sourceFileMap.keys()) {
    const nf = path.normalize(file).toLowerCase();
    if (!nf.startsWith(normalizedRoot)) continue;
    const names = resolveExports(file);
    if (names.length > 0) exportedNames.set(file, names);
  }

  return exportedNames;
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

  // Use TypeScript Program to resolve exports and re-exports across files inside base
  const programNames = await collectNamesWithProgram(base);
  for (const [file, names] of programNames.entries()) {
    if (names.length === 0) continue;
    let importPath: string;
    if (opts.exportFolderName) {
      const parts = file.split(/[/\\]+/);
      const idx = parts.indexOf(opts.exportFolderName);
      if (idx >= 0) {
        const relParts = parts.slice(idx);
        const baseSpec = relParts.join('/').replace(/\.(tsx|ts|jsx|js|svg)$/, '');
        const mode = opts.bareImportsMode || (opts.bareImports ? 'bare' : 'prefixed');
        if (mode === 'bare') {
          importPath = baseSpec;
        } else if (mode === 'prefixed') {
          importPath = './' + baseSpec;
        } else if (mode === 'absolute') {
          importPath = '/' + baseSpec;
        } else {
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
