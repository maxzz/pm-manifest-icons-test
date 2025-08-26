import fg from 'fast-glob';
import { Plugin } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import ts from 'typescript';

export interface CollectIconsOptions {
    srcDir?: string;                // absolute or relative to process.cwd()
    outFile?: string;               // absolute or relative to process.cwd()
    verbose?: boolean;              // print debug info
    exportFolderName?: string;      // optional folder name to make exports relative to (e.g. 'app' -> 'app/..')
    bareImports?: boolean;          // if true, emit bare module specifiers starting at exportFolderName (e.g. 'app/...'). If false, emit './app/...'
    bareImportsMode?: 'bare' | 'prefixed' | 'absolute'; // 'bare' => app/..., 'prefixed' => ./app/..., 'absolute' => /app/...
    recursive?: boolean;            // whether to collect files recursively under srcDir (default: true)
    prefixes?: string[];            // list of name prefixes to detect (default: ['SvgSymbol','Symbol'])
}

async function collectNamesWithProgram(rootDir: string, recursive = true, prefixes: string[] = ['SvgSymbol', 'Symbol']) {
    // collect all TS/TSX/JS files under rootDir (respect recursive flag)
    const pattern = recursive ? '**/*.{ts,tsx,js,jsx,mjs,cjs}' : '*.{ts,tsx,js,jsx,mjs,cjs}';
    const files = await fg([pattern], { cwd: rootDir, absolute: true });

    // Try to find a tsconfig (tsconfig.app.json preferred) up the directory tree from rootDir
    function findTsconfig(startDir: string): string | null {
        let cur = path.resolve(startDir);
        while (true) {
            const tryApp = path.join(cur, 'tsconfig.app.json');
            const tryRoot = path.join(cur, 'tsconfig.json');
            if (fsSync.existsSync(tryApp)) return tryApp;
            if (fsSync.existsSync(tryRoot)) return tryRoot;
            const parent = path.dirname(cur);
            if (parent === cur) return null;
            cur = parent;
        }
    }

    let program: ts.Program;
    let compilerOptions: ts.CompilerOptions = { allowJs: true, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext, moduleResolution: ts.ModuleResolutionKind.NodeJs, baseUrl: process.cwd() };
    const tsconfigPath = findTsconfig(rootDir);
    if (tsconfigPath) {
        // Read and parse the tsconfig using TypeScript APIs so we respect paths/baseUrl/etc.
        const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
        if (!read.error) {
            const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(tsconfigPath));
            const cfgFiles = parsed.fileNames && parsed.fileNames.length > 0 ? parsed.fileNames : files;
            compilerOptions = parsed.options as ts.CompilerOptions || compilerOptions;
            const host = ts.createCompilerHost(compilerOptions || {});
            program = ts.createProgram(cfgFiles, compilerOptions || {}, host);
        } else {
            // fallback to simple program
            const host = ts.createCompilerHost(compilerOptions);
            program = ts.createProgram(files, compilerOptions, host);
        }
    } else {
        const host = ts.createCompilerHost(compilerOptions);
        program = ts.createProgram(files, compilerOptions, host);
    }

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
            for (const p of prefixes) if (n.startsWith(p)) { names.push(n); break; }
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
                            for (const p of prefixes) if (nm.startsWith(p)) { result.add(nm); break; }
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
    const recursive = opts.recursive !== undefined ? !!opts.recursive : true;
    const pattern = recursive ? '**/*.{tsx,ts,jsx,js,svg}' : '*.{tsx,ts,jsx,js,svg}';
    const entries = await fg([pattern], { cwd: base, absolute: true });

    const dest = path.isAbsolute(outFile) ? outFile : path.resolve(process.cwd(), outFile);
    const destDir = path.dirname(dest);
    await fs.mkdir(destDir, { recursive: true });

    const groups: Record<string, string[]> = {};
    const allNames: string[] = [];

    // Use TypeScript Program to resolve exports and re-exports across files inside base
    const prefixes = Array.isArray(opts.prefixes) && opts.prefixes.length > 0 ? opts.prefixes : ['SvgSymbol', 'Symbol'];
    const programNames = await collectNamesWithProgram(base, recursive, prefixes);
    const logger = createLogger(!!opts.verbose);
    // If the program-based resolver found nothing, fall back to per-file AST extraction
    if ((!programNames || programNames.size === 0) && entries.length > 0) {
        logger.warn('program-empty-fallback', { reason: 'program resolver returned no names, falling back to per-file extractor', filesChecked: entries.length });
        for (const file of entries) {
            try {
                const contents = await fs.readFile(file, 'utf8');
                const names = extractNames(contents, file, prefixes);
                if (names && names.length > 0) {
                    // compute importPath same as later logic expects real file path keys
                    programNames.set(file, names);
                }
            } catch (err) {
                logger.warn('read-fail', { file, err: String(err) });
            }
        }
    }
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

    return await generateCollectedFile({ groups, uniqueNames, dest, destDir, opts, entries, logger });
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

function extractNames(contents: string, fileName = 'file.ts', prefixes: string[] = ['SvgSymbol', 'Symbol']): string[] {
    // simple fallback that parses a single file when Program is not used
    const names = new Set<string>();
    const ext = path.extname(fileName).toLowerCase();
    const kind = ext === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(fileName, contents, ts.ScriptTarget.ESNext, true, kind);

    function addIfMatches(name?: ts.Identifier) {
        if (!name) return;
        const n = name.text;
        for (const p of prefixes) if (n.startsWith(p)) { names.add(n); break; }
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
                for (const p of prefixes) if (exportedName.startsWith(p)) { names.add(exportedName); break; }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sf);

    return Array.from(names);
}

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

function generateFileHeader(): string[] {
    return [
        '// Auto-generated by vite-plugin-collect-icons. Do not edit.',
        '/* eslint-disable */',
        ''
    ];
}

/**
 * Generate the collected icons TypeScript file, write it to disk, and log summary info.
 *
 * @param args.groups - Mapping of import path -> exported symbol names.
 *   Example: { 'app/components/ui/icon': ['SvgSymbolFoo','SymbolFoo'] }
 * @param args.uniqueNames - Deduplicated, sorted list of all collected names.
 *   Example: ['SvgSymbolFoo','SymbolFoo']
 * @param args.dest - Destination file path to write.
 *   Example: 'packages/collect-test/collected.ts'
 * @param args.destDir - Directory of the destination file.
 *   Example: 'packages/collect-test'
 * @param args.opts - Collector options passed through (prefixes, verbose, exportFolderName, etc.).
 *   Example: { prefixes: ['SvgSymbol','Symbol'], exportFolderName: 'app', verbose: true }
 * @param args.entries - Array of source files scanned; used for verbose logging.
 *   Example: ['packages/app/.../06-folder.tsx', 'packages/app/.../08-dot.tsx']
 * @param args.logger - Logger returned from createLogger(verbose).
 *
 * @returns Promise resolving to an object { dest, names } where `names` is the list of collected names.
 */
async function generateCollectedFile(args: {
    groups: Record<string, string[]>;
    uniqueNames: string[];
    dest: string;
    destDir: string;
    opts: CollectIconsOptions;
    entries: string[];
    logger: ReturnType<typeof createLogger>;
}) {
    const { groups, uniqueNames, dest, destDir, opts, entries, logger } = args;
    const lines: string[] = [];
    lines.push(...generateFileHeader());
    // imports
    for (const [importPath, names] of Object.entries(groups)) {
        const unique = Array.from(new Set(names)).sort();
        if (unique.length === 0) continue;
        lines.push(`import { ${unique.join(', ')} } from '${importPath}';`);
    }
    lines.push('');
    // export a single object containing all collected components
    if (uniqueNames.length > 0) {
        lines.push(`export const collectedIconComponents = { \n    ${uniqueNames.join(',\n    ')},\n};`);
        lines.push('');
    } else {
        lines.push('export const collectedIconComponents = {};');
        lines.push('');
    }
    // names array and type
    lines.push(`export const collectedIconNames = [\n    ${uniqueNames.map(n => `'${n}'`).join(',\n    ')},\n] as const;\n`);
    lines.push('export type CollectedIconType = typeof collectedIconNames[number];');

    await fs.writeFile(dest, lines.join('\n'), 'utf8');

    // Structured logging
    logger.info('collected', { count: uniqueNames.length, dest });
    if (opts.verbose) {
        logger.debug('files', { files: entries });
        logger.debug('names', { names: uniqueNames });
    }

    return { dest, names: uniqueNames };
}
