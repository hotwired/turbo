import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBody, pathname } from "../helpers/page"

const path = "/src/tests/fixtures/drive_custom_body.html"

test.beforeEach(async ({ page }) => {
  await page.goto(path)
})

test("test drive with a custom body element", async ({ page }) => {
  page.click("#drive")
  await nextBody(page)

  const h1 = await page.locator("h1")
  const differentContent = await page.locator("#different-content")

  assert.equal(pathname(page.url()), "/src/tests/fixtures/drive_custom_body_2.html")
  assert.equal(await h1.textContent(), "Drive (with custom body)")
  assert.equal(await differentContent.textContent(), "Drive 2")
})
