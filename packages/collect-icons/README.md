# collect-icons

Vite plugin to collect icon and symbol sources from the app package.

Usage (from monorepo root):

1. Build the plugin

```
pnpm --filter collect-icons build
pnpm --filter collect-test run build
pnpm --filter collect-test start
2. Run the test runner

The test runner will write `collected-test.json` into `packages/collect-test` when successful.
```
pnpm --filter collect-icons-test run build
pnpm --filter collect-icons-test start
```

The test runner will write `collected-test.json` into `packages/collect-test` when successful.

Example: make bare imports like `app/...` resolve

Vite config (vite.config.ts):

```ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			// 'app' points to packages/app/src so imports like 'app/components/..' work
			'app': path.resolve(__dirname, './packages/app/src')
		}
	}
});
```

TypeScript `paths` (tsconfig.json):

```jsonc
{
	"compilerOptions": {
		"baseUrl": "./",
		"paths": {
			"app/*": ["packages/app/src/*"]
		}
	}
```

When you set `exportFolderName: 'app'` and `bareImportsMode: 'bare'`, the plugin will emit imports like `from 'app/...'` which the Vite alias and tsconfig paths above will resolve correctly.
pnpm --filter collect-icons run collect -- --srcDir packages/app/src/components/ui/icons/symbols/all-other --outFile packages/collect-test/collected-cli.ts --exportFolderName app --mode bare --verbose
CLI
---
You can run the collector directly from the package with:

```
pnpm --filter collect-icons run collect -- --srcDir packages/app/src/components/ui/icons/symbols/all-other --outFile packages/collect-test/collected-cli.ts --exportFolderName app --mode bare --verbose
```

This uses the small `bin/collect.js` wrapper which calls the built `dist/index.js`.

CI example (GitHub Actions)
--------------------------------
Add the following job/step to your workflow to ensure the `collect-test` runner builds in CI and the collector runs:

```yaml
- name: Install and run collect-test
	run: |
		pnpm install
		pnpm --filter collect-test run build
		pnpm --filter collect-icons run collect -- --srcDir packages/app/src/components/ui/icons/symbols/all-other --outFile packages/collect-test/collected-cli-ci.ts --exportFolderName app --mode bare --verbose --recursive
```
