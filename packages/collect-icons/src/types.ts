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
