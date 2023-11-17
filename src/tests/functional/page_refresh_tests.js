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

test("uses morphing to update remote frames", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  expect(await nextEventOnTarget(page, "remote-frame", "turbo:before-frame-morph")).toBeTruthy()
  await expect(page.locator("#remote-frame")).toHaveText("Loaded morphed frame")
})

test("don't refresh frames contained in [data-turbo-permanent] elements", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  expect(await noNextEventOnTarget(page, "remote-permanent-frame", "turbo:before-frame-morph")).toBeTruthy()
})

test("remote frames are excluded from full page morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => document.getElementById("remote-frame").setAttribute("data-modified", "true"))

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  await expect(page.locator("#remote-frame")).toHaveAttribute("data-modified", "true")
  await expect(page.locator("#remote-frame")).toHaveText("Loaded morphed frame")
})

test("remote frames are reloaded if their src changes", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => {
    const frame = document.getElementById("frame")
    frame.setAttribute("src", "/src/tests/fixtures/frames.html")
  })
  await expect(page.locator("#frame")).toHaveText(/Frames: #frame/)

  await page.evaluate(() => {
    document.getElementById("frame").innerHTML = `Modified frame!`
  })

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  await expect(page.locator("#frame")).not.toHaveText(/Frames: #frame/)
  await expect(page.locator("#frame")).toHaveText(/Frame: Loaded/)
})

test("dynamically created remote frames are kept and reloaded", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => {
    const container = document.getElementById("container")
    container.innerHTML = `<turbo-frame id="hello" src="/src/tests/fixtures/frames/hello.html"></turbo-frame>`
  })
  await expect(page.locator("#hello")).toHaveText(/Hello from a frame/)

  await page.evaluate(() => {
    document.getElementById("hello").innerHTML = `Modified frame!`
  })

  await expect(page.locator("#hello")).not.toHaveText(/Hello from a frame/)
  await expect(page.locator("#hello")).toHaveText(/Modified frame!/)

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await nextBeat()

  await expect(page.locator("#hello")).not.toHaveText(/Modified frame!/)
  await expect(page.locator("#hello")).toHaveText(/Hello from a frame/)
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
