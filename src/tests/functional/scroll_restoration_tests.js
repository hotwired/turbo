import { expect, test } from "@playwright/test"
import {
  clickWithoutScrolling,
  nextBeat,
  nextEventNamed,
  reloadPage,
  scrollPosition,
  scrollToSelector
} from "../helpers/page"

test("landing on an anchor", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html#three")
  await nextBeat()
  const { y: yAfterLoading } = await scrollPosition(page)
  expect(yAfterLoading).not.toEqual(0)
})

test("reloading after scrolling", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await scrollToSelector(page, "#three")
  const { y: yAfterScrolling } = await scrollPosition(page)
  expect(yAfterScrolling).not.toEqual(0)

  await reloadPage(page)
  const { y: yAfterReloading } = await scrollPosition(page)
  expect(yAfterReloading).not.toEqual(0)
})

test("returning from history", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await scrollToSelector(page, "#three")
  await page.goto("/src/tests/fixtures/bare.html")
  await page.goBack()

  const { y: yAfterReturning } = await scrollPosition(page)
  expect(yAfterReturning).not.toEqual(0)
})

// A <turbo-frame> navigation with a data-turbo-action promotes to a page Visit. When
// the frame responds with a frame-only body (no full document), that Visit's page
// render is skipped, which sets PageView#forceReloaded. It must be cleared on the
// next real render, otherwise it suppresses the scroll reset of later Visits.
async function assertScrollsToTopAfterFrameNavigation(page, action) {
  await page.goto("/src/tests/fixtures/scroll_reset_after_frame_navigation.html")
  await nextEventNamed(page, "turbo:load") // consume the initial load before tracking later ones

  await page.locator("#frame").evaluate((frame, action) => frame.setAttribute("data-turbo-action", action), action)
  await page.click("#frame-link")
  await nextEventNamed(page, "turbo:load")
  await expect(page).toHaveURL(/frame_only_body\.html/)

  await page.evaluate(() => window.scrollTo(0, 500))
  expect((await scrollPosition(page)).y).toEqual(500)

  await clickWithoutScrolling(page, "#full-visit")
  await nextEventNamed(page, "turbo:load")
  await expect(page).toHaveURL(/scroll_restoration\.html/)

  expect((await scrollPosition(page)).y).toEqual(0)
}

test('scrolls to the top on a Drive visit made after a frame navigation with data-turbo-action="advance"', async ({ page }) => {
  await assertScrollsToTopAfterFrameNavigation(page, "advance")
})

test('scrolls to the top on a Drive visit made after a frame navigation with data-turbo-action="replace"', async ({ page }) => {
  await assertScrollsToTopAfterFrameNavigation(page, "replace")
})
