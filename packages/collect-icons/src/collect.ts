import path from 'path';
import fs from 'fs/promises';
import fg from 'fast-glob';
import { type CollectIconsOptions } from './types';
import { createLogger } from './logger';
import { generateCollectedFile } from './generator';
import { collectNamesWithProgram } from './extract-names-with-program';
import { extractNamesFromFile } from './extract-names-alternative';

export async function collectIcons(opts: CollectIconsOptions = {}): Promise<{ names: string[]; dest: string; }> {
    const logger = createLogger(!!opts.verbose);

    const srcDir = opts.srcDir || 'packages/app/src/components/ui/icons/symbols/all-other';
    const outFile = opts.outFile || 'packages/collect-icons/generated/collected-icons.ts';

    const base = path.isAbsolute(srcDir) ? srcDir : path.resolve(process.cwd(), srcDir);
    const recursive = opts.recursive !== undefined ? !!opts.recursive : true;
    const pattern = recursive ? '**/*.{tsx,ts,jsx,js,svg}' : '*.{tsx,ts,jsx,js,svg}';
    const filenames = await fg([pattern], { cwd: base, absolute: true });

    const dest = path.isAbsolute(outFile) ? outFile : path.resolve(process.cwd(), outFile);
    const destDir = path.dirname(dest);
    await fs.mkdir(destDir, { recursive: true });

    const groups: Record<string, string[]> = {};
    const allNames: string[] = [];

    // Use TypeScript Program to resolve exports and re-exports across files inside base
    const prefixes = Array.isArray(opts.prefixes) && opts.prefixes.length > 0 ? opts.prefixes : ['SvgSymbol', 'Symbol'];
    const programNames = await collectNamesWithProgram(base, recursive, prefixes);

    // If the program-based resolver found nothing, fall back to per-file AST extraction
    if (programNames.size === 0 && filenames.length > 0) {
        logger.info('program-empty-fallback', { reason: 'program resolver returned no names, falling back to per-file extractor', filesChecked: filenames.length });

        for (const filename of filenames) {
            try {
                const contents = await fs.readFile(filename, 'utf8');
                const names = extractNamesFromFile(contents, filename, prefixes);
                if (names && names.length > 0) {
                    // compute importPath same as later logic expects real file path keys
                    programNames.set(filename, names);
                }
            } catch (err) {
                logger.warn('read-fail', { file: filename, err: String(err) });
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
    const uniqueNames = Array.from(new Set(allNames))//.sort(); // don't sort by component name and keep order by import path

    const cnt = await generateCollectedFile({ groups, uniqueNames });
    await fs.writeFile(dest, cnt, 'utf8');

    // Structured logging moved here so caller owns logging
    logger.info('collected', { count: uniqueNames.length, dest });
    if (opts.verbose) {
        logger.debug('files', { files: filenames });
        logger.debug('names', { names: uniqueNames });
    }
    return {
        names: uniqueNames,
        dest,
    };
}
