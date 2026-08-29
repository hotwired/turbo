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

test("lazy-loading frame with root margin", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation_lazy.html")

  assert.equal(await page.textContent("#eager-loaded-frame h2"), "Eager-loaded frame: Not Loaded")

  await page.locator("#load-frame-trigger").evaluate(el => el.scrollIntoView(false))
  await nextEventOnTarget(page, "eager-loaded-frame", "turbo:frame-load")

  assert.equal(await page.textContent("#eager-loaded-frame h2"), "Eager-loaded frame: Loaded")
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
