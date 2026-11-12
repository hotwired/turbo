import { devices } from "@playwright/test"

const config = {
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: {
          timeout: 10000
        },
        hasTouch: true
      }
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        contextOptions: {
          timeout: 10000
        },
        hasTouch: true
      }
    }
  ],
  timeout: 10000,
  browserStartTimeout: 10000,
  retries: 2,
  testDir: "./src/tests/",
  testMatch: /(functional|integration)\/.*_tests\.js/,
  webServer: {
    command: "yarn start",
    url: "http://localhost:9000/src/tests/fixtures/test.js",
    timeout: 10000,
    // eslint-disable-next-line no-undef
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: "http://localhost:9000/"
  }
}

export default config
