import { test } from "@playwright/test"
import { assert } from "chai"

test("window variable with ESM", async ({ page }) => {
  await page.goto("/src/tests/fixtures/esm.html")
  const type = await page.evaluate(() => {
    return typeof window.Turbo
  })
  assert.equal(type, "object")
})
