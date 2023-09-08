import { esbuildPlugin } from '@web/dev-server-esbuild'
import { playwrightLauncher } from '@web/test-runner-playwright'

/** @type {import("@web/test-runner").TestRunnerConfig} */
export default {
  browsers: [
    playwrightLauncher({
      product: 'chromium',
      launchOptions: {
        timeout: 60000
      }
    }),
    playwrightLauncher({
      product: 'firefox',
      launchOptions: {
        timeout: 60000
      }
    }),
    playwrightLauncher({
      product: 'webkit',
      launchOptions: {
        timeout: 60000
      }
    })
  ],
  browserStartTimeout: 600000,
  nodeResolve: true,
  files: "./src/tests/unit/**/*_tests.js",
  testFramework: {
    config: {
      ui: "tdd"
    }
  },
  plugins: [
    esbuildPlugin({ ts: true, target: "es2020" })
  ]
}