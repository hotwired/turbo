import { test, expect } from "@playwright/test"
import { assert } from "chai"
import {
  hasSelector,
  nextBeat,
  readEventLogs
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_lazy.html")
  await readEventLogs(page)
})

test("when lazy loading, loaded promise does not resolve until it is actually loaded", async ({ page }) => {
  await nextBeat()

  const frameContents = "#loading-lazy turbo-frame h2"
  assert.notOk(await hasSelector(page, frameContents))
  assert.ok(await hasSelector(page, "#loading-lazy turbo-frame:not([complete])"))

  await page.click("#loading-lazy summary")
  await nextBeat()

  const inputSelector = "#permanent-input-in-frame"

  await expect(page.locator(inputSelector)).toBeFocused()
})
