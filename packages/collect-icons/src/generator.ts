/**
 * Generate the collected icons TypeScript file and write it to disk.
 *
 * @param groups - Mapping of import path -> exported symbol names. Example: { 'app/components/ui/icon': ['SvgSymbolFoo','SymbolFoo'] }
 * @param uniqueNames - Deduplicated, sorted list of all collected names. Example: ['SvgSymbolFoo','SymbolFoo']
 *
 * @returns Promise resolving to an object { dest, names } where `names` is the list of collected names.
 */
export async function generateCollectedFile({ groups, uniqueNames }: { groups: Record<string, string[]>; uniqueNames: string[]; }): Promise<string> {
    const lines: string[] = [];
    
    const commonPath = findCommonPathInUniqueNames(Object.keys(groups));
    
    generateFileHeader(lines);

    // 1.1. imports
    generateImports(lines, groups);

    // 1.2. exports
    generateExports(lines, groups);

    // 2. export a single object containing all collected components
    const nameToImport = nameToImportMap(groups);

    generateSingleExport(lines, commonPath, uniqueNames, nameToImport, groups);

    // 2.2. export a single function DefAppTypes() that returns a fragment of JSX
    generateDefTypes(lines, commonPath, groups);

    // 2. names array and type
    // lines.push(`export const collectedIconNames = [\n    ${uniqueNames.map(n => `'${n}'`).join(',\n    ')},\n] as const;\n`);
    // lines.push('export type CollectedIconType = typeof collectedIconNames[number];');

    const rv = lines.join('\n');
    return rv;
}

function generateImports(lines: string[], groups: Record<string, string[]>): void {
    // 1.1. imports
    for (const [importPath, componentNames] of Object.entries(groups)) {
        const unique = Array.from(new Set(componentNames)).sort();
        unique.length && lines.push(`import { ${unique.join(', ')} } from '${importPath}';`);
    }
    lines.push('');
}

function generateExports(lines: string[], groups: Record<string, string[]>): void {
    // 1.2. exports
    for (const [importPath, componentNames] of Object.entries(groups)) {
        const unique = Array.from(new Set(componentNames)).sort();
        unique.length && lines.push(`export * from '${importPath}';`);
    }
    lines.push('');
}

function fromFromGetFoldersRootAndSub(from: string, commonPath: string): { folderRoot: string; folderComponent: string; } {
    const short = from.replace(commonPath, '').replace(/^\//, '');
    const parts = short.split('/');
    const folderComponent = parts.pop() || '';
    const folderRoot = parts.join('/');
    return { folderRoot, folderComponent };
}

function generateSingleExport(lines: string[], commonPath: string, uniqueNames: string[], nameToImport: Map<string, string>, groups: Record<string, string[]>): void {
    if (uniqueNames.length > 0) {
        lines.push(`// Common path: ${commonPath}\n`);
        lines.push('export const collectedIconComponents = [');

        const maxNameLen = maxLength(uniqueNames) + 1; // // compute max name length so comments can be aligned; +1 for comma after the name

        const step1: Array<[string, string] | string> = [];

        for (const componentName of uniqueNames) {
            const from = nameToImport.get(componentName);
            if (from) {
                const padding = ' '.repeat(Math.max(1, maxNameLen - componentName.length)); // name, then padding so all comments line up vertically
                // lines.push(`    ${componentName},${padding}// from '${from}'`); // Annotate each entry with a comment showing where it was imported from (first occurrence)

                const { folderRoot, folderComponent } = fromFromGetFoldersRootAndSub(from, commonPath);

                const firstTwo = `    { component: ${componentName},${padding}name: '${componentName}',${padding} folder: '${folderRoot}', `;
                const last = `sub: '${folderComponent}' },`; // sub-folder
                step1.push([firstTwo, last]);
            } else {
                step1.push(`    ${componentName},`);
            }
        }

        const maxLenOfStep1 = maxLength(step1.map(line => typeof line === 'string' ? line : line[0]));

        for (const line of step1) {
            if (typeof line === 'string') {
                lines.push(line);
            } else {
                lines.push(`${line[0]}${' '.repeat(maxLenOfStep1 - line[0].length)} ${line[1]}`);
            }
        }

        lines.push('];');
        lines.push('');
    } else {
        lines.push('export const collectedIconComponents = {};\n');
    }
}

function generateDefTypes(lines: string[], commonPath: string, groups: Record<string, string[]>): void {
    // Export a single function DefAppTypes() that returns a fragment of JSX
    /*
    generate:
        export function DefAppTypes() {
            return (<>
                {SvgSymbolAppWebChrome()}
                ...
                {SvgSymbolCatalog()}
            </>);
        }
    */
    lines.push(`export function DefAppTypes() {`);
    lines.push(`    return (<>`);

    for (const [importPath, componentNames] of Object.entries(groups)) {
        const { folderRoot, folderComponent } = fromFromGetFoldersRootAndSub(importPath, commonPath);
        const unique = Array.from(new Set(componentNames)).filter(n => n.startsWith('SvgSymbol')); //.sort();
        unique.length && lines.push(`        ${unique.map(n => `{/*${folderRoot}*/ ${n}()}`).join('\n        ')}`);
    }

    lines.push(`    </>);`);
    lines.push(`}`);
    lines.push('');
}

function generateFileHeader(lines: string[]): void {
    lines.push('// Auto-generated by vite-plugin-collect-icons. Do not edit.');
    lines.push('/* eslint-disable */');
    lines.push('');
}

// Utilities

function nameToImportMap(groups: Record<string, string[]>): Map<string, string> {
    const rv = new Map<string, string>();
    for (const [importPath, componentNames] of Object.entries(groups)) {
        for (const name of componentNames) {
            if (!rv.has(name)) {
                rv.set(name, importPath);
            }
        }
    }
    return rv;
}

function maxLength(strings: string[]): number {
    return strings.reduce((m, s) => Math.max(m, s.length), 0);
}

function findCommonPathInUniqueNames(uniqueNames: string[]): string {
    if (!uniqueNames || uniqueNames.length === 0) {
        return '';
    }

    // normalize separators and split into parts
    const partsList = uniqueNames.map(p => p.replace(/\\/g, '/').split('/'));
    const minLen = Math.min(...partsList.map(parts => parts.length));

    const commonParts: string[] = [];
    for (let i = 0; i < minLen; i++) {
        const segment = partsList[0][i];
        if (partsList.every(parts => parts[i] === segment)) {
            commonParts.push(segment);
        } else {
            break;
        }
    }

    return commonParts.join('/');
}

//TODO: add exort root or extract root from comments
//TODO: instead of comment add this as second member of each component name
//TODO: app: show folder name if there are multiple
