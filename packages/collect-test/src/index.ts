import path from 'path';
// Import the local package directly during development so tsc resolves types/files.
// When published or installed as a workspace dependency, you can switch back to
import { collectIcons } from '../../../packages/collect-icons/src/index';
// import { collectIcons } from 'collect-icons';

async function main() {
    const { names, dest } = await collectIcons({
        srcDir: path.resolve(process.cwd(), '../../packages/app/src/components/ui/icons/symbols/all-other'),
        outFile: path.resolve(process.cwd(), 'test-results/collected-test.ts'),
        verbose: true,
        //exportFolderName: 'app',
        bareImportsMode: 'bare',
    });
    console.log(`Collected ${names.length} names to ${dest}`);
}

main().catch(err => { console.error(err); process.exit(1); });
