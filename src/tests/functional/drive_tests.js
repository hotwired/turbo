import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBody, pathname, visitAction } from "../helpers/page"

const path = "/src/tests/fixtures/drive.html"

test.beforeEach(async ({ page }) => {
  await page.goto(path)
})

test("test drive enabled by default; click normal link", async ({ page }) => {
  await page.click("#drive_enabled")
  await nextBody(page)
  assert.equal(pathname(page.url()), path)
})

test("test drive to external link", async ({ page }) => {
  await page.route("https://example.com", async (route) => {
    await route.fulfill({ body: "Hello from the outside world" })
  })

  await page.click("#drive_enabled_external")
  await nextBody(page)

  assert.equal(await page.evaluate(() => window.location.href), "https://example.com/")
  assert.equal(await page.textContent("body"), "Hello from the outside world")
})

test("test drive enabled by default; click link inside data-turbo='false'", async ({ page }) => {
  await page.click("#drive_disabled")
  await nextBody(page)
  assert.equal(pathname(page.url()), path)
  assert.equal(await visitAction(page), "load")
})
