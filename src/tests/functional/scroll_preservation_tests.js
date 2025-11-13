import { test, expect } from "@playwright/test"
import { nextEventNamed } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
})

test("it preserves the scroll position when the turbo-visit-scroll meta tag is 'preserve'", async ({ page }) => {
  const preserve = page.locator("#preserve")
  await preserve.scrollIntoViewIfNeeded()

  const [ scrollTop, scrollLeft ] = await page.evaluate(() => [window.scrollY, window.scrollX])

  await clickWithoutScrolling(preserve)
  await nextEventNamed(page, "turbo:render")

  expect(await scrollPosition(page)).toEqual([ scrollTop, scrollLeft ])
})

test("it resets the scroll position when the turbo-visit-scroll meta tag is 'reset'", async ({ page }) => {
  const reset = page.locator("#reset")
  await reset.scrollIntoViewIfNeeded()

  await clickWithoutScrolling(reset)
  await nextEventNamed(page, "turbo:render")

  expect(await scrollPosition(page)).toEqual([ 0, 0 ])
})

function clickWithoutScrolling(locator) {
  // not using locator.click() because it can reset the scroll position
  return locator.evaluate((element) => element.click())
}

function scrollPosition(page) {
  return page.evaluate(() => [
    document.documentElement.scrollTop || document.body.scrollTop,
    document.documentElement.scrollLeft || document.body.scrollLeft
  ])
}
