import { devices } from "@playwright/test"

const config = {
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: {
          timeout: 60000
        }
      }
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        contextOptions: {
          timeout: 60000
        }
      }
    }
  ],
  browserStartTimeout: 60000,
  retries: 2,
  testDir: "./src/tests/",
  testMatch: /(functional|integration)\/.*_tests\.js/,
  webServer: {
    command: "yarn start",
    url: "http://localhost:9000/src/tests/fixtures/test.js",
    timeout: 120 * 1000,
    // eslint-disable-next-line no-undef
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: "http://localhost:9000/"
  }
}

export default config