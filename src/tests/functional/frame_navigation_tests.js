import { expect, test } from "@playwright/test"
import { getFromLocalStorage, nextBeat, nextEventNamed, nextEventOnTarget, pathname, readEventLogs, scrollToSelector, withPathname } from "../helpers/page"

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

test("promoted frame visit keeps the document head when the response describes none", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_promoted_visit.html")
  await readEventLogs(page)

  await page.click("#to-no-head")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveTitle("Promoted frame visits")
  await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1)
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
})

test("promoted frame visit merges the head the response describes without discarding the rest", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_promoted_visit.html")
  await expect(page.locator('meta[name="partial"]')).toHaveCount(0)
  await readEventLogs(page)

  await page.click("#to-partial-head")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveTitle("Promoted frame title")
  await expect(page.locator("head title")).toHaveCount(1)
  await expect(page.locator('meta[name="partial"]')).toHaveCount(1)
  await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1)
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
})

test("promoted frame visit advances history when the response omits tracked elements", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await readEventLogs(page)

  await page.click("#link-to-frame-with-empty-head")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/empty_head.html"))

  await page.click("#drive-away")
  await nextEventNamed(page, "turbo:load")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))

  await page.goBack()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/empty_head.html"))
  await expect(page.locator("#empty-head h2")).toHaveText("Frame updated")

  await page.goBack()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frame_navigation.html"))
  await expect(page.locator("#link-to-frame-with-empty-head")).toHaveCount(1)

  await page.goForward()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/empty_head.html"))
  await expect(page.locator("#empty-head h2")).toHaveText("Frame updated")

  await page.goForward()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
})

test("promoted frame visit replaces history and keeps the head when the response describes none", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_promoted_start.html")
  await readEventLogs(page)
  await page.click("#start-promoted-visit")
  await nextEventNamed(page, "turbo:load")

  await page.click("#replace-with-no-head")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/promoted_no_head.html"))
  await expect(page).toHaveTitle("Promoted frame visits")
  await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1)
  await expect(page.locator("html")).toHaveAttribute("lang", "en")

  await page.click("#drive-away")
  await nextEventNamed(page, "turbo:load")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frame_promoted_destination.html"))

  await page.goBack()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/promoted_no_head.html"))
  await expect(page.locator("#promoted h2")).toHaveText("Frame: No head")

  await page.goBack()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frame_promoted_start.html"))
  await expect(page.locator("h1")).toHaveText("Promoted frame start")

  await page.goForward()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/promoted_no_head.html"))
  await expect(page.locator("#promoted h2")).toHaveText("Frame: No head")
  await expect(page).toHaveTitle("Promoted frame visits")

  await page.goForward()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frame_promoted_destination.html"))
})

test("promoted frame visit merges a complete document head", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_promoted_full_visit.html")
  await readEventLogs(page)

  await page.click("#to-full-head")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveTitle("Complete promoted frame title")
  await expect(page.locator("head title")).toHaveCount(1)
  await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1)
  await expect(page.locator("html")).toHaveAttribute("lang", "fr")
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
