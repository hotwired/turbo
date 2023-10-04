import { test, expect } from "@playwright/test"
import { nextEventNamed } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
})

test("it preserves the scroll position when the turbo-scroll meta tag is 'preserve'", async ({ page }) => {
  const preserve = await page.locator("#preserve")
  await preserve.scrollIntoViewIfNeeded()

  const [ scrollTop, scrollLeft ] = await page.evaluate(() => [window.scrollY, window.scrollX])

  await clickWithoutScrolling(preserve)
  await nextEventNamed(page, "turbo:render")

  await assertPageScroll(page, scrollTop, scrollLeft)
})

test("it resets the scroll position when the turbo-scroll meta tag is 'reset'", async ({ page }) => {
  const reset = await page.locator("#reset")
  await reset.scrollIntoViewIfNeeded()

  await clickWithoutScrolling(reset)
  await nextEventNamed(page, "turbo:render")

  await assertPageScroll(page, 0, 0)
})

async function clickWithoutScrolling(locator) {
  // not using locator.click() because it can reset the scroll position
  await locator.evaluate((element) => element.click())
}

async function assertPageScroll(page, top, left) {
  const [scrollTop, scrollLeft] = await page.evaluate(() => {
    return [
      document.documentElement.scrollTop || document.body.scrollTop,
      document.documentElement.scrollLeft || document.body.scrollLeft
    ]
  })

  expect(scrollTop).toEqual(top)
  expect(scrollLeft).toEqual(left)
}
