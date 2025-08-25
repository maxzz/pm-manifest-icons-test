import { Plugin } from 'vite';

export interface CollectIconsOptions {
    srcDir?: string;
    outFile?: string;
    verbose?: boolean;
    exportFolderName?: string;
    bareImports?: boolean;
    bareImportsMode?: 'bare' | 'prefixed' | 'absolute';
}

export declare function collectIcons(opts?: CollectIconsOptions): Promise<{ dest: string; names: string[]; }>;

declare function collectIconsPlugin(opts?: CollectIconsOptions): Plugin;

export default collectIconsPlugin;
