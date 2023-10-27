import { test, expect } from "@playwright/test"
import {
  nextAttributeMutationNamed,
  nextBeat,
  nextEventNamed,
  nextEventOnTarget,
  noNextEventOnTarget,
  noNextEventNamed
} from "../helpers/page"

test("renders a page refresh with morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
})

test("doesn't morph when the turbo-refresh-method meta tag is not 'morph'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_replace.html")

  await page.click("#form-submit")
  expect(await noNextEventNamed(page, "turbo:render", { renderMethod: "morph" })).toBeTruthy()
})

test("doesn't morph when the navigation doesn't go to the same URL", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#link")
  await expect(page.locator("h1")).toHaveText("One")

  expect(await noNextEventNamed(page, "turbo:render", { renderMethod: "morph" })).toBeTruthy()
})

test("uses morphing to update remote frames", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  // Only the frame marked with refresh="morph" uses morphing
  expect(await nextEventOnTarget(page, "remote-frame", "turbo:before-frame-morph")).toBeTruthy()
  await expect(page.locator("#remote-frame")).toHaveText("Loaded morphed frame")
})

test("don't refresh frames contained in [data-turbo-permanent] elements", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  // Only the frame marked with refresh="morph" uses morphing
  expect(await noNextEventOnTarget(page, "refresh-reload", "turbo:before-frame-morph")).toBeTruthy()
})

test("frames marked with refresh='morph' are excluded from full page morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => document.getElementById("remote-frame").setAttribute("data-modified", "true"))

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  await expect(page.locator("#remote-frame")).toHaveAttribute("data-modified", "true")
  await expect(page.locator("#remote-frame")).toHaveText("Loaded morphed frame")
})

test("it preserves the scroll position when the turbo-refresh-scroll meta tag is 'preserve'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => window.scrollTo(10, 10))
  await assertPageScroll(page, 10, 10)

  // not using page.locator("#form-submit").click() because it can reset the scroll position
  await page.evaluate(() => document.getElementById("form-submit")?.click())
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await assertPageScroll(page, 10, 10)
})

test("it resets the scroll position when the turbo-refresh-scroll meta tag is 'reset'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_scroll_reset.html")

  await page.evaluate(() => window.scrollTo(10, 10))
  await assertPageScroll(page, 10, 10)

  // not using page.locator("#form-submit").click() because it can reset the scroll position
  await page.evaluate(() => document.getElementById("form-submit")?.click())
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await assertPageScroll(page, 0, 0)
})

test("it preserves data-turbo-permanent elements", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => {
    const element = document.getElementById("preserve-me")
    element.textContent = "Preserve me, I have a family!"
  })

  await expect(page.locator("#preserve-me")).toHaveText("Preserve me, I have a family!")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(page.locator("#preserve-me")).toHaveText("Preserve me, I have a family!")
})

test("it reloads data-controller attributes after a morph", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  expect(
    await nextAttributeMutationNamed(page, "stimulus-controller", "data-controller")
  ).toEqual(null)

  await nextBeat()

  expect(
    await nextAttributeMutationNamed(page, "stimulus-controller", "data-controller")
  ).toEqual("test")
})

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
