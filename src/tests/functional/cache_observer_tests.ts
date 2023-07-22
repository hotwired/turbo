import { test } from "@playwright/test"
import { assert } from "chai"
import { hasSelector, nextBody } from "../helpers/page"

test("test removes temporary elements", async ({ page }) => {
  await page.goto("/src/tests/fixtures/cache_observer.html")

  assert.equal(await page.textContent("#temporary"), "data-turbo-temporary")

  await page.click("#link")
  await nextBody(page)
  await page.goBack()
  await nextBody(page)

  assert.notOk(await hasSelector(page, "#temporary"))
})

test("test removes temporary elements with deprecated turbo-cache=false selector", async ({ page }) => {
  await page.goto("/src/tests/fixtures/cache_observer.html")

  assert.equal(await page.textContent("#temporary-with-deprecated-selector"), "data-turbo-cache=false")

  await page.click("#link")
  await nextBody(page)
  await page.goBack()
  await nextBody(page)

  assert.notOk(await hasSelector(page, "#temporary-with-deprecated-selector"))
})

test("test following a redirect renders [data-turbo-temporary] elements before the cache removes", async ({ page }) => {
  await page.goto("/src/tests/fixtures/navigation.html")
  await page.click("#redirect-to-cache-observer")
  await nextBody(page)

  assert.equal(await page.textContent("#temporary"), "data-turbo-temporary")
})
