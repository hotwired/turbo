import { expect, test } from "@playwright/test"
import { getFromLocalStorage, nextBeat, nextEventNamed, nextEventOnTarget, pathname, scrollToSelector, withPathname } from "../helpers/page"

test("frame navigation with descendant link", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#inside")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("frame navigation with self link", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#self")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("frame navigation with exterior link", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#outside")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("frame navigation with exterior link in Shadow DOM", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#outside-in-shadow-dom")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("frame navigation with data-turbo-action", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#link-to-frame-with-empty-head")
  await nextBeat()

  await nextEventOnTarget(page, "empty-head", "turbo:frame-load")

  const frameText = page.locator("#empty-head h2")
  await expect(frameText).toHaveText("Frame updated")

  const titleText = page.locator("h1")
  await expect(titleText).toHaveText("Frame navigation tests")
})

test("navigating back after promoting frame navigation with mismatched head restores previous frame contents", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#link-to-frame-with-empty-head")
  await nextEventOnTarget(page, "empty-head", "turbo:frame-load")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#empty-head h2")).toHaveText("Frame updated")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/empty_head.html"))

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frame_navigation.html"))
  await expect(page.locator("#empty-head h2")).not.toBeVisible()
  await expect(page.locator("#empty-head #link-to-frame-with-empty-head")).toBeVisible()
})

test("navigating back after promoting frame navigation with frame-fragment response restores previous frame contents", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#link-to-frame-fragment")
  await nextEventOnTarget(page, "empty-head", "turbo:frame-load")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#empty-head h2")).toHaveText("Frame updated")
  await expect(page).toHaveURL(withPathname("/__turbo/frame-navigation/empty-head-fragment"))

  // Navigate to an intermediate page so the snapshot cache for the advanced URL
  // is exercised on the way back through history. Without the fix, the cache key
  // for lastRenderedLocation stays at the *source* URL (frame_navigation.html)
  // instead of the *advanced* URL, which overwrites the source's snapshot with
  // the new frame content. The second back navigation then renders stale content.
  await page.evaluate(() => window.Turbo.visit("/src/tests/fixtures/one.html"))
  await nextEventNamed(page, "turbo:load")

  // First back — returns to the advanced URL
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  // Second back — returns to frame_navigation.html
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frame_navigation.html"))
  await expect(page.locator("#empty-head h2")).not.toBeVisible()
  await expect(page.locator("#empty-head #link-to-frame-fragment")).toBeVisible()
})

test("frame navigation emits fetch-request-error event when offline", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")
  await page.context().setOffline(true)
  await page.click("#tab-2")
  await nextEventOnTarget(page, "tab-frame", "turbo:fetch-request-error")
})

test("lazy-loaded frame promotes navigation", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")

  await expect(page.locator("#eager-loaded-frame h2")).toHaveText("Eager-loaded frame: Not Loaded")

  await scrollToSelector(page, "#eager-loaded-frame")
  await nextEventOnTarget(page, "eager-loaded-frame", "turbo:frame-load")

  await expect(page.locator("#eager-loaded-frame h2")).toHaveText("Eager-loaded frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame_for_eager.html"))
})

test("promoted frame navigation updates the URL before rendering", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")

  page.evaluate(() => {
    addEventListener("turbo:before-frame-render", () => {
      localStorage.setItem("beforeRenderUrl", window.location.pathname)
      localStorage.setItem("beforeRenderContent", document.querySelector("#tab-content")?.textContent || "")
    })
  })

  await page.click("#tab-2")
  await nextEventNamed(page, "turbo:before-frame-render")

  expect(await getFromLocalStorage(page, "beforeRenderUrl")).toEqual("/src/tests/fixtures/tabs/two.html")
  expect(await getFromLocalStorage(page, "beforeRenderContent")).toEqual("One")

  await nextEventNamed(page, "turbo:frame-render")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/tabs/two.html"))
  await expect(page.locator("#tab-content")).toHaveText("Two")
})

test("promoted frame navigations are cached", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")

  await page.click("#tab-2")
  await nextEventOnTarget(page, "tab-frame", "turbo:frame-load")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#tab-content")).toHaveText("Two")
  expect(pathname((await page.getAttribute("#tab-frame", "src")) || "")).toEqual("/src/tests/fixtures/tabs/two.html")
  await expect(page.locator("#tab-frame"), "sets [complete]").toHaveAttribute("complete")

  await page.click("#tab-3")
  await nextEventOnTarget(page, "tab-frame", "turbo:frame-load")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#tab-content")).toHaveText("Three")
  expect(pathname((await page.getAttribute("#tab-frame", "src")) || "")).toEqual("/src/tests/fixtures/tabs/three.html")
  await expect(page.locator("#tab-frame"), "sets [complete]").toHaveAttribute("complete")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#tab-content")).toHaveText("Two")
  expect(pathname((await page.getAttribute("#tab-frame", "src")) || "")).toEqual("/src/tests/fixtures/tabs/two.html")
  await expect(page.locator("#tab-frame"), "caches two.html with [complete]").toHaveAttribute("complete")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#tab-content")).toHaveText("One")
  await expect(page.locator("#tab-frame"), "caches one.html without #tab-frame[src]").not.toHaveAttribute("src")
  await expect(page.locator("#tab-frame"), "caches one.html without [complete]").not.toHaveAttribute("complete")
})
