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
