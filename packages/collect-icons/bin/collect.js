#!/usr/bin/env node
const path = require('path');
const { collectIcons } = require('../dist/index');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  const prefixesRawValues = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const noEq = a.indexOf('=') === -1;
      if (!noEq) {
        const [k, v] = a.slice(2).split('=');
        if (k === 'prefixes') prefixesRawValues.push(v);
        else out[k] = v;
        continue;
      }
      if (a === '--srcDir') out.srcDir = args[++i];
      else if (a === '--prefixes') {
        // collect subsequent tokens until next -- as a single logical value
        const vals = [];
        let j = i + 1;
        while (j < args.length && !args[j].startsWith('--')) {
          vals.push(args[j]);
          j++;
        }
        prefixesRawValues.push(vals.join(' '));
        i = j - 1;
      }
      else if (a === '--outFile') out.outFile = args[++i];
      else if (a === '--exportFolderName') out.exportFolderName = args[++i];
      else if (a === '--mode') out.bareImportsMode = args[++i];
      else if (a === '--verbose') out.verbose = true;
      else if (a === '--recursive') out.recursive = true;
      else if (a === '--no-recursive') out.recursive = false;
    }
  }
  if (out.prefixes) prefixesRawValues.push(out.prefixes);
  if (prefixesRawValues.length > 0) {
    const outArr = [];
    function pushParsed(v) {
      const val = String(v).trim();
      if (!val) return;
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          for (const p of parsed) if (p) outArr.push(String(p));
          return;
        }
      } catch (e) {}
      if (val.indexOf(',') !== -1) {
        for (const p of val.split(',').map(s => s.trim()).filter(Boolean)) outArr.push(p);
        return;
      }
      if (val.indexOf(' ') !== -1) {
        for (const p of val.split(/\s+/).map(s => s.trim()).filter(Boolean)) outArr.push(p);
        return;
      }
      outArr.push(val);
    }
    for (const r of prefixesRawValues) pushParsed(r);
    out.prefixes = Array.from(new Set(outArr));
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  const rawArgs = process.argv.slice(2);
  const hasSrc = rawArgs.some(a => a.toLowerCase().startsWith('--srcdir'));
  const hasPrefixesFlag = rawArgs.some(a => a.toLowerCase().startsWith('--prefixes'));
  if (!hasSrc) {
    console.error('Missing required argument: --srcDir');
    process.exit(1);
  }
  if (!hasPrefixesFlag) {
    console.error('Missing required argument: --prefixes');
    process.exit(1);
  }
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
