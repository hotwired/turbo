import { expect, test } from "@playwright/test"
import { nextEventNamed } from "../helpers/page"

test("removes temporary elements", async ({ page }) => {
  await page.goto("/src/tests/fixtures/cache_observer.html")

  await expect(page.locator("#temporary")).toHaveText("data-turbo-temporary")

  await page.click("#link")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()

  await expect(page.locator("#temporary")).not.toBeAttached()
})

test("following a redirect renders [data-turbo-temporary] elements before the cache removes", async ({ page }) => {
  await page.goto("/src/tests/fixtures/navigation.html")
  await page.click("#redirect-to-cache-observer")

  await expect(page.locator("#temporary")).toHaveText("data-turbo-temporary")
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
