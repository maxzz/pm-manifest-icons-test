import collect from 'collect-icons';
import path from 'path';

async function main() {
  // The plugin exports a factory; call it to get the plugin object and invoke the buildStart hook directly
  const plugin = collect({ srcDir: path.resolve(process.cwd(), '../../app/src/components/ui/icons/symbols/all-other'), outFile: path.resolve(process.cwd(), 'collected-test.ts') }) as any;
  if (plugin && typeof plugin.buildStart === 'function') {
    await plugin.buildStart();
    console.log('Collected to collected-test.json');
  } else {
    console.error('Plugin did not expose buildStart');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
