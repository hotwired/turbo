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
