import fg from 'fast-glob';
import { Plugin } from 'vite';
import path from 'path';
import fs from 'fs/promises';

export interface CollectIconsOptions {
  srcDir?: string; // absolute or relative to process.cwd()
  outFile?: string; // output JSON file path
}

export default function collectIconsPlugin(opts: CollectIconsOptions = {}): Plugin {
  const srcDir = opts.srcDir || 'packages/app/src/components/ui/icons/symbols/all-other';
  const outFile = opts.outFile || 'collected-icons.json';

  return {
    name: 'vite-plugin-collect-icons',
    apply: 'build',
    async buildStart() {
      const base = path.isAbsolute(srcDir) ? srcDir : path.resolve(process.cwd(), srcDir);
      const entries = await fg(['**/*.{tsx,ts,jsx,js,svg}'], { cwd: base, absolute: true });
      const collected: Record<string, string> = {};

      for (const file of entries) {
        const rel = path.relative(base, file).replaceAll('\\', '/');
        const contents = await fs.readFile(file, 'utf8');
        collected[rel] = contents;
      }

  await fs.writeFile(outFile, JSON.stringify(collected, null, 2), 'utf8');
  console.warn(`Collected ${Object.keys(collected).length} icon files to ${outFile}`);
    }
  };
}
