import { test } from "@playwright/test"
import { assert } from "chai"
import {
  getFromLocalStorage,
  nextBody,
  pathname,
  searchParams,
  setLocalStorageFromEvent,
  visitAction,
} from "../helpers/page"

const path = "/src/tests/fixtures/drive_disabled.html"

test.beforeEach(async ({ page }) => {
  await page.goto(path)
})

test("test drive disabled by default; click normal link", async ({ page }) => {
  await page.click("#drive_disabled")
  await nextBody(page)

  assert.equal(pathname(page.url()), path)
  assert.equal(await visitAction(page), "load")
})

test("test drive disabled by default; click link inside data-turbo='true'", async ({ page }) => {
  await page.click("#drive_enabled")
  await nextBody(page)

  assert.equal(pathname(page.url()), path)
  assert.equal(await visitAction(page), "advance")
})

test("test drive disabled by default; submit form inside data-turbo='true'", async ({ page }) => {
  await setLocalStorageFromEvent(page, "turbo:submit-start", "formSubmitted", "true")

  await page.click("#no_submitter_drive_enabled a#requestSubmit")
  await nextBody(page)

  assert.ok(await getFromLocalStorage(page, "formSubmitted"))
  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(await visitAction(page), "advance")
  assert.equal(await searchParams(page.url()).get("greeting"), "Hello from a redirect")
})
