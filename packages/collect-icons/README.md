# collect-icons

Vite plugin to collect icon and symbol sources from the app package.

Usage (from monorepo root):

1. Build the plugin

```
pnpm --filter collect-icons build
```

2. Run the test runner

```
pnpm --filter collect-icons-test run build
pnpm --filter collect-icons-test start
```

The test runner will write `collected-test.json` into `packages/collect-icons/test` when successful.

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
}
```

When you set `exportFolderName: 'app'` and `bareImportsMode: 'bare'`, the plugin will emit imports like `from 'app/...'` which the Vite alias and tsconfig paths above will resolve correctly.
