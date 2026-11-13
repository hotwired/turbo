import { expect, test } from "@playwright/test"
import { readEventLogs, visitAction } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/async_script.html")
  await readEventLogs(page)
})

test("does not emit turbo:load when loaded asynchronously after DOMContentLoaded", async ({ page }) => {
  const events = await readEventLogs(page)

  expect(events).toEqual([])
})

test("following a link when loaded asynchronously after DOMContentLoaded", async ({ page }) => {
  await page.click("#async-link")

  expect(await visitAction(page)).toEqual("advance")
})
