#!/usr/bin/env node
import path from 'path';
import { collectIcons } from '../src/index';

type Mode = 'bare' | 'prefixed' | 'absolute';

function parseArgs() {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();
  const prefixesRawValues: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      let key = a.slice(2);
      // support --no-xxx boolean negation
      if (key.startsWith('no-')) {
        key = key.slice(3);
        map.set(key, 'false');
        continue;
      }
      // support --key=value
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        if (k === 'prefixes') prefixesRawValues.push(v);
        else map.set(k, v);
        continue;
      }
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        map.set(key, 'true');
      } else {
        if (key === 'prefixes') {
          const vals: string[] = [];
          let j = i + 1;
          while (j < args.length && !args[j].startsWith('--')) {
            vals.push(args[j]);
            j++;
          }
          prefixesRawValues.push(vals.join(' '));
          i = j - 1;
        } else {
          map.set(key, next);
          i++;
        }
      }
    }
  }

  const srcDir = map.get('srcDir') || 'packages/app/src/components/ui/icons/symbols/all-other';
  const outFile = map.get('outFile') || 'collected-cli.ts';
  const exportFolderName = map.get('exportFolderName') || 'app';
  if (map.get('prefixes')) prefixesRawValues.push(map.get('prefixes')!);
  let prefixes: string[] | undefined;
  if (prefixesRawValues.length > 0) {
    const outArr: string[] = [];
    function pushParsed(val: string) {
      const v = String(val).trim();
      if (!v) return;
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) {
          for (const p of parsed) if (p) outArr.push(String(p));
          return;
        }
      } catch (e) {
        // not JSON
      }
      if (v.includes(',')) {
        for (const p of v.split(',').map(s => s.trim()).filter(Boolean)) outArr.push(p);
        return;
      }
      if (v.includes(' ')) {
        for (const p of v.split(/\s+/).map(s => s.trim()).filter(Boolean)) outArr.push(p);
        return;
      }
      outArr.push(v);
    }
    for (const r of prefixesRawValues) pushParsed(r);
    prefixes = Array.from(new Set(outArr));
  }
  const mode = (map.get('mode') || 'bare') as Mode;
  if (!['bare', 'prefixed', 'absolute'].includes(mode)) {
    throw new Error("Invalid mode: must be one of 'bare' | 'prefixed' | 'absolute'");
  }
  const verbose = map.get('verbose') === 'true' || map.get('verbose') === '1';

  return { srcDir, outFile, exportFolderName, mode, verbose, prefixes } as {
    srcDir: string;
    outFile: string;
    exportFolderName: string;
    mode: Mode;
    verbose: boolean;
    prefixes?: string[] | undefined;
  };
}

async function main() {
  const argv = parseArgs();
  const rawArgs = process.argv.slice(2);
  const hasSrc = rawArgs.some(a => a.toLowerCase().startsWith('--srcdir'));
  const hasPrefixesFlag = rawArgs.some(a => a.toLowerCase().startsWith('--prefixes'));
  if (!hasSrc) {
    // eslint-disable-next-line no-console
    console.error('Missing required argument: --srcDir');
    process.exit(1);
  }
  if (!hasPrefixesFlag) {
    // eslint-disable-next-line no-console
    console.error('Missing required argument: --prefixes');
    process.exit(1);
  }
  const res = await collectIcons({
    srcDir: path.resolve(process.cwd(), argv.srcDir),
    outFile: path.resolve(process.cwd(), argv.outFile),
    exportFolderName: argv.exportFolderName,
  prefixes: argv.prefixes,
    bareImportsMode: argv.mode as any,
    verbose: argv.verbose,
  });
  // eslint-disable-next-line no-console
  console.log(`Wrote ${res.names.length} names to ${res.dest}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
