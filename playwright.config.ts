import { type PlaywrightTestConfig, devices } from "@playwright/test"

const config: PlaywrightTestConfig = {
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
  retries: 2,
  testDir: "./src/tests/",
  testMatch: /(functional|integration)\/.*_tests\.ts/,
  webServer: {
    command: "yarn start",
    url: "http://localhost:9000/src/tests/fixtures/test.js",
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:9000/",
  },
}

export default config
