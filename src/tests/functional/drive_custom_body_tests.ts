import { test } from "@playwright/test"
import { assert } from "chai"
import { nextEventNamed, pathname, getFromLocalStorage, setLocalStorageFromEvent } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/drive_custom_body.html")
})

test("test drive with a custom body element", async ({ page }) => {
  await page.click("#drive")
  await nextEventNamed(page, "turbo:load")

  assert.equal(pathname(page.url()), "/src/tests/fixtures/drive_custom_body_2.html")
  assert.equal(await page.textContent("h1"), "Drive (with custom body)")
  assert.equal(await page.textContent("#different-content"), "Drive 2")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  assert.equal(pathname(page.url()), "/src/tests/fixtures/drive_custom_body.html")
  assert.equal(await page.textContent("h1"), "Drive (with custom body)")
  assert.equal(await page.textContent("#different-content"), "Drive 1")

  await page.goForward()
  await nextEventNamed(page, "turbo:load")

  assert.equal(pathname(page.url()), "/src/tests/fixtures/drive_custom_body_2.html")
  assert.equal(await page.textContent("h1"), "Drive (with custom body)")
  assert.equal(await page.textContent("#different-content"), "Drive 2")
})

test("test drive with mismatched custom body elements", async ({ page }) => {
  await setLocalStorageFromEvent(page, "turbo:reload", "reloaded", "true")
  await page.click("#mismatch")
  await page.waitForEvent("load")

  assert.equal(await page.textContent("h1"), "Drive (with custom body 3)")
  assert.equal(await getFromLocalStorage(page, "reloaded"), "true", "dispatches turbo:reload event")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/drive_custom_body_3.html")
})
