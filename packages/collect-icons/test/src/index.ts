import { collectIcons } from 'collect-icons';
import path from 'path';

async function main() {
  const res = await collectIcons({ srcDir: path.resolve(process.cwd(), '../../app/src/components/ui/icons/symbols/all-other'), outFile: path.resolve(process.cwd(), 'collected-test.ts'), verbose: true, exportFolderName: '../app' });
  console.log(`Collected ${res.names.length} names to ${res.dest}`);
}

main().catch(err => { console.error(err); process.exit(1); });
