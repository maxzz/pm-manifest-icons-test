#!/usr/bin/env node
import path from 'path';
import { collectIcons } from '../src/index';

type Mode = 'bare' | 'prefixed' | 'absolute';

function parseArgs() {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        map.set(key, 'true');
      } else {
        map.set(key, next);
        i++;
      }
    }
  }

  const srcDir = map.get('srcDir') || 'packages/app/src/components/ui/icons/symbols/all-other';
  const outFile = map.get('outFile') || 'collected-cli.ts';
  const exportFolderName = map.get('exportFolderName') || 'app';
  const mode = (map.get('mode') || 'bare') as Mode;
  if (!['bare', 'prefixed', 'absolute'].includes(mode)) {
    throw new Error("Invalid mode: must be one of 'bare' | 'prefixed' | 'absolute'");
  }
  const verbose = map.get('verbose') === 'true' || map.get('verbose') === '1';

  return { srcDir, outFile, exportFolderName, mode, verbose } as {
    srcDir: string;
    outFile: string;
    exportFolderName: string;
    mode: Mode;
    verbose: boolean;
  };
}

async function main() {
  const argv = parseArgs();
  const res = await collectIcons({
    srcDir: path.resolve(process.cwd(), argv.srcDir),
    outFile: path.resolve(process.cwd(), argv.outFile),
    exportFolderName: argv.exportFolderName,
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
