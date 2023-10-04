import { test, expect } from "@playwright/test"
import { scrollPosition, nextEventNamed } from "../helpers/page"

test("resets scroll position when navigating to a page with turbo-visit-scroll='reset'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await nextEventNamed(page, "turbo:load")

  const reset = page.locator("#reset")
  await reset.scrollIntoViewIfNeeded()

  await clickWithoutScrolling(reset)
  await nextEventNamed(page, "turbo:load")

  expect(await scrollPosition(page)).toEqual({ x: 0, y: 0 })
})

test("preserves scroll position when navigating to page with turbo-visit-scroll='preserve'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await nextEventNamed(page, "turbo:load")

  const preserve = page.locator("#preserve")
  await preserve.scrollIntoViewIfNeeded()

  const { x: scrollLeft, y: scrollTop } = await scrollPosition(page)

  await clickWithoutScrolling(preserve)
  await nextEventNamed(page, "turbo:load")

  expect(await scrollPosition(page)).toEqual({ x: scrollLeft, y: scrollTop })
})

test("restores scroll position during 'restore' visit to page with turbo-visit-scroll='reset'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration/reset.html")
  await nextEventNamed(page, "turbo:load")

  const link = page.locator("#default")
  await link.scrollIntoViewIfNeeded()

  const { x: scrollLeft, y: scrollTop } = await scrollPosition(page)

  await clickWithoutScrolling(link)
  await nextEventNamed(page, "turbo:load")
  await expect(page).toHaveURL(await link.evaluate(a => a.href))

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  expect(await scrollPosition(page)).toEqual({ x: scrollLeft, y: scrollTop })
})

test("restores scroll position during 'restore' visits to a page with turbo-visit-scroll='preserve'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration/preserve.html")
  await nextEventNamed(page, "turbo:load")

  const reset = page.locator("#reset")
  await reset.scrollIntoViewIfNeeded()

  const { x: scrollLeft, y: scrollTop } = await scrollPosition(page)

  await clickWithoutScrolling(reset)
  await nextEventNamed(page, "turbo:load")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  expect(await scrollPosition(page)).toEqual({ x: scrollLeft, y: scrollTop })
})

function clickWithoutScrolling(locator) {
  // not using locator.click() because it can reset the scroll position
  return locator.evaluate((element) => element.click())
}
