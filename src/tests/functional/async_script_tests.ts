import { test } from "@playwright/test"
import { assert } from "chai"
import { readEventLogs, visitAction } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/async_script.html")
  await readEventLogs(page)
})

test("test does not emit turbo:load when loaded asynchronously after DOMContentLoaded", async ({ page }) => {
  const events = await readEventLogs(page)

  assert.deepEqual(events, [])
})

test("test following a link when loaded asynchronously after DOMContentLoaded", async ({ page }) => {
  await page.click("#async-link")

  assert.equal(await visitAction(page), "advance")
})
