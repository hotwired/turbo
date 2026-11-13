import { expect, test } from "@playwright/test"
import {
  clickWithoutScrolling,
  nextBeat,
  nextEventNamed,
  readEventLogs,
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

test('scrolls to the top on a Drive visit made after a frame navigation with data-turbo-action="advance"', async ({ page }) => {
  await assertScrollsToTopAfterFrameNavigation(page, "advance")
})

test('scrolls to the top on a Drive visit made after a frame navigation with data-turbo-action="replace"', async ({ page }) => {
  await assertScrollsToTopAfterFrameNavigation(page, "replace")
})

test("Turbo history restores the exact scroll position immediately despite smooth scroll CSS", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration_with_smooth_scroll.html")
  await readEventLogs(page)

  const expectedPosition = { x: 0, y: 600 }
  await page.evaluate(async (position) => {
    window.scrollRestorationSentinel = "preserved across Turbo visits"
    window.scrollRestorationLoads = []
    addEventListener("turbo:load", () => {
      window.scrollRestorationLoads.push({ pathname: location.pathname, x: scrollX, y: scrollY })
    })

    await new Promise((resolve) => {
      addEventListener("scroll", () => requestAnimationFrame(resolve), { once: true })
      scrollTo({ left: position.x, top: position.y, behavior: "instant" })
    })
  }, expectedPosition)
  expect(await scrollPosition(page)).toEqual(expectedPosition)

  await page.click("#leave")
  await nextEventNamed(page, "turbo:load")
  await expect(page).toHaveURL(new URL("/src/tests/fixtures/one.html", page.url()).href)
  expect(await page.evaluate(() => window.scrollRestorationSentinel)).toEqual("preserved across Turbo visits")
  await page.evaluate(() => scrollTo({ left: 0, top: 0, behavior: "instant" }))
  expect(await scrollPosition(page)).toEqual({ x: 0, y: 0 })

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  expect(await page.evaluate(() => window.scrollRestorationSentinel)).toEqual("preserved across Turbo visits")
  const restoredAtLoad = await page.evaluate(() => window.scrollRestorationLoads.at(-1))
  expect(restoredAtLoad).toEqual({
    pathname: "/src/tests/fixtures/scroll_restoration_with_smooth_scroll.html",
    ...expectedPosition
  })
})

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
