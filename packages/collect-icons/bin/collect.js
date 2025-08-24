#!/usr/bin/env node
const path = require('path');
const { collectIcons } = require('../dist/index');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--srcDir') out.srcDir = args[++i];
  else if (a === '--prefixes') out.prefixes = args[++i];
    else if (a === '--outFile') out.outFile = args[++i];
    else if (a === '--exportFolderName') out.exportFolderName = args[++i];
    else if (a === '--mode') out.bareImportsMode = args[++i];
    else if (a === '--verbose') out.verbose = true;
    else if (a === '--recursive') out.recursive = true;
    else if (a === '--no-recursive') out.recursive = false;
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  opts.srcDir = path.resolve(process.cwd(), opts.srcDir || 'packages/app/src/components/ui/icons/symbols/all-other');
  opts.outFile = path.resolve(process.cwd(), opts.outFile || 'collected-cli.ts');
  opts.exportFolderName = opts.exportFolderName || 'app';
  opts.bareImportsMode = opts.bareImportsMode || 'bare';
  // parse prefixes if provided as JSON array string or comma-separated
  if (typeof opts.prefixes === 'string') {
    try {
      const pjson = JSON.parse(opts.prefixes);
      if (Array.isArray(pjson)) opts.prefixes = pjson.map(String);
    } catch (e) {
      opts.prefixes = opts.prefixes.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  const res = await collectIcons(opts);
  console.log(`Wrote ${res.names.length} names to ${res.dest}`);
}

main().catch(err => { console.error(err); process.exit(1); });
