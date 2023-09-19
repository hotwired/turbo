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

test("test before cache content should reflect page content prior to navigation for links outside advance turbo frames", async ({ page }) => {
  await page.goto("/src/tests/fixtures/before_cache.html?start=y")
  await page.evaluate(() => {
    document.addEventListener("turbo:before-cache", () => {
      console.log(`before-cache ${JSON.stringify(window.location.search)} ${document.querySelector('#origin')?.innerText}`)
    })
  })

  page.addListener("console", (message) => {
    assert.equal(message.text(), `before-cache "?start=y" undefined`)
  })

  await page.click("#advance-home")
  await nextBody(page)
})

test("test before cache content should reflect page content prior to navigation for links inside advance turbo frames", async ({ page }) => {
  await page.goto("/src/tests/fixtures/before_cache.html?")
  await page.click("#advance-home")
  await nextBody(page)

  await page.evaluate(() => {
    document.addEventListener("turbo:before-cache", () => {
      console.log(`before-cache ${JSON.stringify(window.location.search)} ${document.querySelector('#origin')?.innerText}`)
    })
  })

  page.addListener("console", (message) => {
    assert.equal(message.text(), `before-cache "?in_frame=n" home`)
  })

  await page.click("#advance-in")
  await nextBody(page)
})
