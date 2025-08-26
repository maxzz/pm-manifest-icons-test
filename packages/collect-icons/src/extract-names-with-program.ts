import fg from 'fast-glob';
import fsSync from 'fs';
import path from 'path';
import ts from 'typescript';

export async function collectNamesWithProgram(rootDir: string, recursive = true, prefixes: string[] = ['SvgSymbol', 'Symbol']): Promise<Map<string, string[]>> {
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
