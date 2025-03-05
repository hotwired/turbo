import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBody, pathname, visitAction } from "../helpers/page"

test("visiting a location inside the root", async ({ page }) => {
  page.goto("/src/tests/fixtures/root/index.html")
  page.click("#link-page-inside")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/root/page.html")
  assert.notEqual(await visitAction(page), "load")
})

test("visiting the root itself", async ({ page }) => {
  page.goto("/src/tests/fixtures/root/page.html")
  page.click("#link-root")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/root/")
  assert.notEqual(await visitAction(page), "load")
})

test("visiting a location outside the root", async ({ page }) => {
  page.goto("/src/tests/fixtures/root/index.html")
  page.click("#link-page-outside")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "load")
})
