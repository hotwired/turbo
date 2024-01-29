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
  await nextEventNamed(page, "turbo:before-render", { renderMethod: "morph" })
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
})

test("dispatches a turbo:before-morph-element and turbo:morph-element event for each morphed element", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")
  await page.fill("#form-text", "Morph me")
  await page.click("#form-submit")

  await nextEventOnTarget(page, "form-text", "turbo:before-morph-element")
  await nextEventOnTarget(page, "form-text", "turbo:morph-element")
})

test("preventing a turbo:before-morph-element prevents the morph", async ({ page }) => {
  const input = await page.locator("#form-text")
  const submit = await page.locator("#form-submit")

  await page.goto("/src/tests/fixtures/page_refresh.html")
  await input.evaluate((input) => input.addEventListener("turbo:before-morph-element", (event) => event.preventDefault()))
  await input.fill("Morph me")
  await submit.click()

  await nextEventOnTarget(page, "form-text", "turbo:before-morph-element")
  await noNextEventOnTarget(page, "form-text", "turbo:morph-element")

  await expect(input).toHaveValue("Morph me")
})

test("turbo:morph-element Stimulus listeners can handle morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await expect(page.locator("#test-output")).toHaveText("connected")

  await page.fill("#form-text", "Ignore me")
  await page.click("#form-submit")

  await expect(page.locator("#form-text")).toHaveValue("")
  await expect(page.locator("#test-output")).toHaveText("connected")
})

test("turbo:before-morph-attribute Stimulus listeners can handle morphing attributes", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")
  const controller = page.locator("#stimulus-controller")
  const input = controller.locator("input")

  await expect(page.locator("#test-output")).toHaveText("connected")

  await input.fill("controller state")
  await page.fill("#form-text", "Ignore me")
  await page.click("#form-submit")

  const { mutationType } = await nextEventOnTarget(page, "stimulus-controller", "turbo:before-morph-attribute", { attributeName: "data-test-state-value" })

  await expect(mutationType).toEqual("update")
  await expect(controller).toHaveAttribute("data-test-state-value", "controller state")
  await expect(page.locator("#form-text")).toHaveValue("")
  await expect(page.locator("#test-output")).toHaveText("connected")
})


test("renders a page refresh with morphing when the paths are the same but search params are different", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#replace-link")
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
