import { test, expect } from "@playwright/test"
import { assert } from "chai"
import {
  hasSelector,
  nextBeat,
  nextBody,
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

test("uses morphing to update remote frames marked with refresh='morph'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  // Only the frame marked with refresh="morph" uses morphing
  expect(await nextEventOnTarget(page, "refresh-morph", "turbo:before-frame-morph")).toBeTruthy()
  expect(await noNextEventOnTarget(page, "refresh-reload", "turbo:before-frame-morph")).toBeTruthy()

  await expect(page.locator("#refresh-morph")).toHaveText("Loaded morphed frame")

  // Regular turbo-frames also gets reloaded since their complete attribute is removed
  await expect(page.locator("#refresh-reload")).toHaveText("Loaded reloadable frame")
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

  await page.evaluate(() => document.getElementById("refresh-morph").setAttribute("data-modified", "true"))

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  await expect(page.locator("#refresh-morph")).toHaveAttribute("data-modified", "true")
  await expect(page.locator("#refresh-morph")).toHaveText("Loaded morphed frame")
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

test("it does not preserve the scroll position on regular 'advance' navigations, despite of using a 'preserve' option", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => window.scrollTo(10, 10))
  await assertPageScroll(page, 10, 10)

  await page.evaluate(() => document.getElementById("reload-link").click())
  await nextEventNamed(page, "turbo:render", { renderMethod: "replace" })

  await assertPageScroll(page, 0, 0)
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

test("it preserves focus across morphs", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  const input = await page.locator("#form input[type=text]")

  await input.fill("Discard me")
  await input.press("Enter")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(input).toBeFocused()
  await expect(input).toHaveValue("")
})

test("it preserves focus and the [data-turbo-permanent] element's value across morphs", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  const input = await page.locator("#form input[type=text]")

  await input.evaluate((element) => element.setAttribute("data-turbo-permanent", ""))
  await input.fill("Preserve me")
  await input.press("Enter")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(input).toBeFocused()
  await expect(input).toHaveValue("Preserve me")
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

test("it preserves data-turbo-permanent elements that don't match when their ids do", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => {
    const element = document.getElementById("preserve-me")

    element.textContent = "Preserve me, I have a family!"
    document.getElementById("container").append(element)
  })

  await expect(page.locator("#preserve-me")).toHaveText("Preserve me, I have a family!")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(page.locator("#preserve-me")).toHaveText("Preserve me, I have a family!")
})

test("renders unprocessable entity responses with morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#reject form.unprocessable_entity input[type=submit]")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Unprocessable Entity", "renders the response HTML")
  assert.notOk(await hasSelector(page, "#frame form.reject"), "replaces entire page")
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
