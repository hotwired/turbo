import { expect, test } from "@playwright/test"

test("activating scripts respects CSP nonces during a Turbo visit", async ({ page }) => {
  await page.goto("/__turbo/csp_nonce/source")
  await page.waitForFunction(() => window.Turbo)
  await page.evaluate(() => window.cspNavigationSentinel = true)
  await page.click("#next")

  await expect(page.locator("h1")).toHaveText("Destination")
  expect(await page.evaluate(() => window.cspNavigationSentinel)).toBe(true)
  await expect.poll(() => page.evaluate(() => window.activatedHeadNonce)).toEqual("turbo-test-nonce")
  await expect(page.locator("#head-nonce-script")).toHaveJSProperty("nonce", "turbo-test-nonce")
  await expect.poll(() => page.evaluate(() => window.activatedBodyNonce)).toEqual("explicit-test-nonce")
  await expect(page.locator("#body-nonce-script")).toHaveJSProperty("nonce", "explicit-test-nonce")
  expect(await page.evaluate(() => window.skippedScriptExecuted)).toBeUndefined()
})
