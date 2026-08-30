import { test, expect } from "@playwright/test"
import { nextEventNamed, nextEventOnTarget } from "../helpers/page"

// Records every turbo:before-frame-refresh into a page-global array, so assertions
// about which frames did (and did not) dispatch it don't depend on the shared
// event-log cursor that nextEvent* helpers consume.
function collectFrameRefreshEvents(page) {
  return page.evaluate(() => {
    window.frameRefreshEvents = []
    addEventListener("turbo:before-frame-refresh", ({ target, detail }) => {
      window.frameRefreshEvents.push({ id: target.id, source: detail.source })
    })
  })
}

function frameRefreshEvents(page) {
  return page.evaluate(() => window.frameRefreshEvents)
}

test("a refresh='morph' frame is refreshed by a page morph by default", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_manual_frame.html")
  await expect(page.locator("#auto-frame")).toHaveText("Fetched auto frame")

  await page.locator("#auto-frame").evaluate((frame) => (frame.textContent = "Automatic sentinel"))
  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  // The default (no policy) frame is re-fetched, replacing the sentinel.
  await expect(page.locator("#auto-frame")).toHaveText("Fetched auto frame")
})

test("a data-turbo-refresh-policy='manual' frame is not refreshed by a page morph", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_manual_frame.html")
  await expect(page.locator("#manual-frame")).toHaveText("Fetched manual frame")

  await collectFrameRefreshEvents(page)
  await page.locator("#manual-frame").evaluate((frame) => (frame.textContent = "Manual sentinel"))
  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  // The manual frame is preserved: no refetch, no in-place morph, sentinel kept.
  await expect(page.locator("#manual-frame")).toHaveText("Manual sentinel")

  // A declaratively opted-out frame is preserved without even dispatching the
  // cancelable event, while the default frame is refreshed as usual.
  const events = await frameRefreshEvents(page)
  expect(events.some((event) => event.id === "manual-frame")).toBe(false)
  expect(events.some((event) => event.id === "auto-frame" && event.source === "page-morph")).toBe(true)
})

test("turbo:before-frame-refresh fires for a refreshed frame with the morph source", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_manual_frame.html")
  await expect(page.locator("#auto-frame")).toHaveText("Fetched auto frame")

  await page.click("#form-submit")

  const detail = await nextEventOnTarget(page, "auto-frame", "turbo:before-frame-refresh")
  expect(detail.source).toEqual("page-morph")
})

test("canceling turbo:before-frame-refresh opts a frame out of the morph refresh", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_manual_frame.html")
  await expect(page.locator("#auto-frame")).toHaveText("Fetched auto frame")

  await page.locator("#auto-frame").evaluate((frame) => {
    frame.addEventListener("turbo:before-frame-refresh", (event) => event.preventDefault())
    frame.textContent = "Prevented sentinel"
  })

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(page.locator("#auto-frame")).toHaveText("Prevented sentinel")
})

test("a data-turbo-refresh-policy='manual' frame missing from new content is preserved without refetching", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_manual_frame.html")
  await expect(page.locator("#manual-frame")).toHaveText("Fetched manual frame")

  await page.evaluate(() => {
    const frame = document.getElementById("manual-frame")
    frame.textContent = "Manual sentinel"
    frame.id = "manual-missing" // absent from the server's new content
  })

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(page.locator("#manual-missing"), "the frame is preserved").toBeAttached()
  await expect(page.locator("#manual-missing")).toHaveText("Manual sentinel")
})

test("a data-turbo-refresh-policy='manual' frame is preserved even when its src is incompatible with the new content", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_manual_frame.html")
  await expect(page.locator("#manual-frame")).toHaveText("Fetched manual frame")

  // Change the live frame's src so it no longer matches the src in the server's
  // new content: an incompatible frame, which shouldRefreshFrameWithMorphing
  // rejects and would otherwise be morphed in place from the page response. The
  // opt-out is evaluated before that compatibility check, so the frame is still
  // preserved.
  await page.locator("#manual-frame").evaluate((frame) => frame.setAttribute("src", "/src/tests/fixtures/frame_manual_changed.html"))
  await expect(page.locator("#manual-frame")).toHaveText("Fetched changed manual frame")
  await page.locator("#manual-frame").evaluate((frame) => (frame.textContent = "Manual sentinel"))

  await page.click("#form-submit")
  await nextEventNamed(page, "turbo:render", { renderMethod: "morph" })

  await expect(page.locator("#manual-frame")).toHaveText("Manual sentinel")
})

test("data-turbo-refresh-policy='manual' does not affect an explicit reload()", async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_manual_frame.html")
  await expect(page.locator("#manual-frame")).toHaveText("Fetched manual frame")

  await collectFrameRefreshEvents(page)
  await page.locator("#manual-frame").evaluate((frame) => (frame.textContent = "Manual sentinel"))
  await page.evaluate(() => document.getElementById("manual-frame").reload())

  // The policy scopes only morph refreshes; explicit reload() still re-fetches
  // and never dispatches the morph-refresh event.
  expect(await nextEventOnTarget(page, "manual-frame", "turbo:before-frame-morph")).toBeTruthy()
  await expect(page.locator("#manual-frame")).toHaveText("Fetched manual frame")
  expect(await frameRefreshEvents(page)).toEqual([])
})

test("during an ancestor frame morph, a manual inner frame is preserved and an automatic one is refreshed", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_morph_manual_inner.html")
  await expect(page.locator("#inner-manual")).toHaveText("Inner manual frame loaded")
  await expect(page.locator("#inner-auto")).toHaveText("Inner auto frame loaded")

  await collectFrameRefreshEvents(page)
  await page.locator("#inner-manual").evaluate((frame) => (frame.textContent = "Inner manual sentinel"))
  await page.locator("#inner-auto").evaluate((frame) => (frame.textContent = "Inner auto sentinel"))

  // Reloading the outer refresh='morph' frame morphs its response, which reloads
  // the inner refresh='morph' frames via MorphingFrameRenderer.
  await page.evaluate(() => document.getElementById("outer-morph").reload())
  await nextEventOnTarget(page, "outer-morph", "turbo:before-frame-morph")

  // The manual inner frame is preserved; the automatic one is refreshed.
  await expect(page.locator("#inner-manual"), "manual inner frame preserved").toHaveText("Inner manual sentinel")
  await expect(page.locator("#inner-auto")).toHaveText("Inner auto frame loaded")

  const events = await frameRefreshEvents(page)
  expect(events.some((event) => event.id === "inner-manual")).toBe(false)
  expect(events.some((event) => event.id === "inner-auto" && event.source === "frame-morph")).toBe(true)
})
