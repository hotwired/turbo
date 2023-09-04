import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

/** @type {import("@web/test-runner").TestRunnerConfig} */
export default {
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit' }),
  ],
  nodeResolve: true,
  files: "./src/tests/unit/**/*_tests.js",
  testFramework: {
    config: {
      ui: "tdd"
    }
  },
  plugins: [
    esbuildPlugin({ ts: true, target: "es2020" })
  ],
};
