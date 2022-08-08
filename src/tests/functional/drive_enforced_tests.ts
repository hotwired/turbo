import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBody, pathname, visitAction } from "../helpers/page"

const path = "/src/tests/fixtures/drive_enforced.html"

test.beforeEach(async ({ page }) => {
  await page.goto(path)
})

test("test drive enforced; click normal link", async ({ page }) => {
  page.click("#drive_enabled")
  await nextBody(page)
  assert.equal(pathname(page.url()), path)
  assert.equal(await visitAction(page), "advance")
})

test("test drive  enforced to external link", async ({ page }) => {
  page.click("#drive_enabled_external")
  await nextBody(page)
  assert.equal(await page.evaluate(() => window.location.href), "https://example.com/")
})

test("test drive enforced; click link inside data-turbo='false'", async ({ page }) => {
  page.click("#drive_disabled")
  await nextBody(page)
  assert.equal(pathname(page.url()), path)
  assert.equal(await visitAction(page), "advance")
})
