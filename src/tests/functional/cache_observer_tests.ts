import { test } from "@playwright/test"
import { assert } from "chai"
import { hasSelector, nextBody } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/cache_observer.html")
})

test("test removes stale elements", async ({ page }) => {
  assert(await hasSelector(page, "#flash"))
  page.click("#link")
  await nextBody(page)
  await page.goBack()
  await nextBody(page)
  assert.notOk(await hasSelector(page, "#flash"))
})
