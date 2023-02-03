// import { rollupBundlePlugin } from '@web/dev-server-rollup';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';
// import resolve from "@rollup/plugin-node-resolve"
// import typescript from "@rollup/plugin-typescript"

export default {
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit' }),
  ],
  nodeResolve: true,
  files: "./src/tests/unit/**/*_tests.ts",

  plugins: [
    esbuildPlugin({ ts: true, target: "es2020" })
  ],
};
