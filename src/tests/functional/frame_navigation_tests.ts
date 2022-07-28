import { test } from "@playwright/test"
import { getFromLocalStorage, nextBeat, nextEventNamed, nextEventOnTarget, pathname } from "../helpers/page"
import { assert } from "chai"

test("test frame navigation with descendant link", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#inside")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("test frame navigation with self link", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#self")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("test frame navigation with exterior link", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
  await page.click("#outside")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("test promoted frame navigation updates the URL before rendering", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")

  page.evaluate(() => {
    addEventListener("turbo:before-frame-render", () => {
      localStorage.setItem("beforeRenderUrl", window.location.pathname)
      localStorage.setItem("beforeRenderContent", document.querySelector("#tab-content")?.textContent || "")
    })
  })

  await page.click("#tab-2")
  await nextEventNamed(page, "turbo:before-frame-render")

  assert.equal(await getFromLocalStorage(page, "beforeRenderUrl"), "/src/tests/fixtures/tabs/two.html")
  assert.equal(await getFromLocalStorage(page, "beforeRenderContent"), "One")

  await nextEventNamed(page, "turbo:frame-render")

  assert.equal(await pathname(page.url()), "/src/tests/fixtures/tabs/two.html")
  assert.equal(await page.textContent("#tab-content"), "Two")
})

test("test promoted frame navigations are cached", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")

  await page.click("#tab-2")
  await nextEventNamed(page, "turbo:frame-render")

  assert.equal(await page.textContent("#tab-content"), "Two")

  await page.click("#tab-3")
  await nextEventNamed(page, "turbo:frame-render")

  assert.equal(await page.textContent("#tab-content"), "Three")

  await page.goBack()
  await nextBeat()

  assert.equal(await page.textContent("#tab-content"), "Two")

  await page.goBack()
  await nextBeat()

  assert.equal(await page.textContent("#tab-content"), "One")
})
