import { test } from "@playwright/test"
import { getFromLocalStorage, nextEventNamed, nextEventOnTarget, pathname } from "../helpers/page"
import { assert } from "chai"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
})

test("test frame navigation with descendant link", async ({ page }) => {
  await page.click("#inside")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("test frame navigation with self link", async ({ page }) => {
  await page.click("#self")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("test frame navigation with exterior link", async ({ page }) => {
  await page.click("#outside")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("test frame navigation emits fetch-error event when offline", async ({ page }) => {
  await page.context().setOffline(true)
  await page.click("#top")
  await nextEventOnTarget(page, "html", "turbo:fetch-error")
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
