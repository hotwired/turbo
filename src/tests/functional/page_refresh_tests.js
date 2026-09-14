import { test, expect } from "@playwright/test"
import {
  nextEventNamed,
  nextEventOnTarget,
  noNextEventOnTarget,
  noNextEventNamed,
  getSearchParam,
  refreshWithStream
} from "../helpers/page"

test("renders a page refresh with morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:before-render", { renderMethod: "morph" })
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
})

test("async page refresh with turbo-stream", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await expect(page.locator("#title")).toHaveText("Page to be refreshed")

  await page.evaluate(() => document.querySelector("#title").innerText = "Updated")
  await expect(page.locator("#title")).toHaveText("Updated")
  await refreshWithStream(page)

  await expect(page.locator("#title")).not.toHaveText("Updated")
  await expect(page.locator("#title")).toHaveText("Page to be refreshed")
  expect(await noNextEventNamed(page, "turbo:before-cache")).toBeTruthy()
})

test("async page refresh with turbo-stream sequentially initiate Visits", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")
  await refreshWithStream(page)
  await nextEventNamed(page, "turbo:morph")
  await nextEventNamed(page, "turbo:load")

  await refreshWithStream(page)
  await nextEventNamed(page, "turbo:morph")
  await nextEventNamed(page, "turbo:load")
})

test("async page refresh with turbo-stream does not interrupt an initiated Visit", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")
  await page.click("#delayed_link")
  await refreshWithStream(page)

  await expect(page.locator("h1")).toHaveText("One")
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

test("page refreshes cause a reload when assets change", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#add-new-assets")
  await expect(page.locator("#new-stylesheet")).toHaveCount(1)
  await page.click("#form-submit")

  await nextEventNamed(page, "turbo:load")
  await expect(page.locator("#new-stylesheet")).toHaveCount(0)
})

test("reloading when assets change uses the response URL of a prior redirect", async ({page}) => {
  const destinations = []

  page.on("request", (request) => {
    const path = new URL(request.url()).pathname

    if (path === "/__turbo/redirect") {
      destinations.push("redirect")
    } else if (path === "/src/tests/fixtures/link_redirect_target.html") {
      destinations.push("target")
    }
  })

  await page.goto("/src/tests/fixtures/link_redirect.html")
  await page.click("#indirect")

  await page.waitForURL("/src/tests/fixtures/link_redirect_target.html")

  expect(destinations, "redirects once").toEqual(expect.arrayContaining(["redirect", "target", "target"]))
})

test("renders a page refresh with morphing when the paths are the same but search params are different", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#replace-link")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
})

test("renders a page refresh with morphing when the GET form paths are the same but search params are different", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  const input = page.locator("form[method=get] input[name=query]")

  await input.fill("Search")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(input).toBeFocused()
  expect(getSearchParam(page.url(), "query")).toEqual("Search")

  await input.press("?")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(input).toBeFocused()
  expect(getSearchParam(page.url(), "query")).toEqual("Search?")
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

test("uses morphing to only update remote frames marked with refresh='morph'", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  // Only the frame marked with refresh="morph" uses morphing
  expect(await nextEventOnTarget(page, "refresh-morph", "turbo:before-frame-morph")).toBeTruthy()
  expect(await noNextEventOnTarget(page, "refresh-reload", "turbo:before-frame-morph")).toBeTruthy()

  await expect(page.locator("#refresh-morph")).toHaveText("Loaded morphed frame")

  // Regular turbo-frames also gets reloaded since their complete attribute is removed
  await expect(page.locator("#refresh-reload")).toHaveText("Loaded reloadable frame")
})

test("overrides the meta value to render with replace when the Turbo Stream has [method=replace] attribute", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => document.body.insertAdjacentHTML("beforeend", `<turbo-stream action="refresh" method="replace"></turbo-stream>`))
  await nextEventNamed(page, "turbo:render", { renderMethod: "replace" })
})

test("don't refresh frames contained in [data-turbo-permanent] elements", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  // Set the frame's text since the final assertion cannot be noNextEventOnTarget as that is passing even when the frame reloads.
  const frame = page.locator("#remote-permanent-frame")
  await frame.evaluate((frame) => frame.textContent = "Frame to be preserved")

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(page.locator("#remote-permanent-frame")).toHaveText("Frame to be preserved")
})

test("frames marked with refresh='morph' are excluded from full page morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => document.getElementById("refresh-morph").setAttribute("data-modified", "true"))

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(page.locator("#refresh-morph")).toHaveAttribute("data-modified", "true")
  await expect(page.locator("#refresh-morph")).toHaveText("Loaded morphed frame")
})

test("navigated frames without refresh attribute are reset after morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#refresh-after-navigation-link")

  await expect(
    page.locator("#refresh-after-navigation-content"),
    "navigates theframe"
  ).toBeAttached()

  await page.click("#form-submit")

  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(
    page.locator("#refresh-after-navigation-link"),
    "resets the frame"
  ).toBeAttached()

  await expect(
    page.locator("#refresh-after-navigation-content"),
    "does not reload the frame"
  ).not.toBeAttached()
})

test("frames with refresh='morph' are preserved when missing from new content", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => {
    const frame = document.getElementById("refresh-morph")
    frame.id = "missing-frame" // Change ID so to simulate a removed frame
  })

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(page.locator("#missing-frame"), "the frame is preserved").toBeAttached()
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

test("overrides the meta value to reset the scroll position when the Turbo Stream has [scroll=reset] attribute", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.evaluate(() => window.scrollTo(10, 10))
  await assertPageScroll(page, 10, 10)

  await page.evaluate(() => document.body.insertAdjacentHTML("beforeend", `<turbo-stream action="refresh" scroll="reset"></turbo-stream>`))
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await assertPageScroll(page, 0, 0)
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

  await input.fill("Preserve me")
  await input.press("Enter")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(input).toBeFocused()
  await expect(input).toHaveValue("Preserve me")
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

test("it preserves data-turbo-permanent children", async ({ page }) => {
  await page.goto("/src/tests/fixtures/permanent_children.html")

  await page.evaluate(() => {
    // simulate result of client-side drag-and-drop reordering
    document.getElementById("first-li").before(document.getElementById("second-li"))

    // set state of data-turbo-permanent checkbox
    document.getElementById("second-checkbox").checked = true
  })

  // morph page back to original li ordering
  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  // data-turbo-permanent checkbox should still be checked
  await expect(
    page.locator("#second-checkbox:checked"),
    "retains state of data-turbo-permanent child"
  ).toBeAttached()
})

test("renders unprocessable content responses with morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#reject form.unprocessable_content input[type=submit]")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  const title = page.locator("h1")
  await expect(title, "renders the response HTML").toHaveText("Unprocessable Content")
  await expect(page.locator("#frame form.reject"), "replaces entire page").not.toBeAttached()
})

test("doesn't render previews when morphing", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh.html")

  await page.click("#link")
  await page.click("#page-refresh-link")
  await page.click("#refresh-link")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })
  await noNextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  const title = page.locator("h1")
  await expect(title).toHaveText("Page to be refreshed")
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
