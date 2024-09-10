import { test } from "@playwright/test"
import { getFromLocalStorage, nextBeat, nextEventNamed, nextEventOnTarget, pathname, scrollToSelector, sleep } from "../helpers/page"
import { assert } from "chai"

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

  const frameText = await page.textContent("#empty-head h2")
  assert.equal(frameText, "Frame updated")

  const titleText = await page.textContent("h1")
  assert.equal(titleText, "Frame navigation tests")
})

test("frame navigation emits fetch-request-error event when offline", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")
  await page.context().setOffline(true)
  await page.click("#tab-2")
  await nextEventOnTarget(page, "tab-frame", "turbo:fetch-request-error")
})

test("promoted frame submits a single request per navigation", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")
  await nextEventNamed(page, "turbo:load")

  const requestedPathnames = await capturingRequestPathnames(page, async () => {
    await page.click("#tab-2")
    await nextEventNamed(page, "turbo:load")
    await page.click("#tab-3")
    await nextEventNamed(page, "turbo:load")
  })

  assert.deepEqual(requestedPathnames, ["/src/tests/fixtures/tabs/two.html", "/src/tests/fixtures/tabs/three.html"])
})

test("promoted frames do not submit requests when navigating back and forward with history", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")
  await nextEventNamed(page, "turbo:load")
  await page.click("#tab-2")
  await nextEventNamed(page, "turbo:load")
  await page.click("#tab-3")
  await nextEventNamed(page, "turbo:load")

  const requestedPathnames = await capturingRequestPathnames(page, async () => {
    await page.goBack()
    await nextEventNamed(page, "turbo:load")
    await page.goForward()
    await nextEventNamed(page, "turbo:load")
  })

  assert.deepEqual(requestedPathnames, [])
})

test("navigating back when frame navigation has been canceled does not submit a request", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs/three.html")
  await nextEventNamed(page, "turbo:load")
  await delayResponseForLink(page, "#tab-2", 2000)
  page.click("#tab-2")
  await page.click("#tab-1")
  await nextEventNamed(page, "turbo:load")

  assert.equal("/src/tests/fixtures/tabs.html", pathname(page.url()))

  const requestedPathnames = await capturingRequestPathnames(page, async () => {
    await page.goBack()
    await nextEventNamed(page, "turbo:load")
  })

  assert.deepEqual([], requestedPathnames)
})

test("canceling frame requests don't mutate the history", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")
  await page.click("#tab-2")
  await nextEventOnTarget(page, "tab-frame", "turbo:frame-load")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("#tab-content"), "Two")
  assert.equal(pathname((await page.getAttribute("#tab-frame", "src")) || ""), "/src/tests/fixtures/tabs/two.html")
  assert.equal(await page.getAttribute("#tab-frame", "complete"), "", "sets [complete]")

  // This request will be canceled
  await delayResponseForLink(page, "#tab-1", 2000)
  page.click("#tab-1")
  await page.click("#tab-3")

  await nextEventOnTarget(page, "tab-frame", "turbo:frame-load")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("#tab-content"), "Three")
  assert.equal(pathname((await page.getAttribute("#tab-frame", "src")) || ""), "/src/tests/fixtures/tabs/three.html")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("#tab-content"), "Two")
  assert.equal(pathname((await page.getAttribute("#tab-frame", "src")) || ""), "/src/tests/fixtures/tabs/two.html")

  // Make sure the frame is not mutated after some time.
  await nextBeat()

  assert.equal(await page.textContent("#tab-content"), "Two")
  assert.equal(pathname((await page.getAttribute("#tab-frame", "src")) || ""), "/src/tests/fixtures/tabs/two.html")
})

test("lazy-loaded frame promotes navigation", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")

  assert.equal(await page.textContent("#eager-loaded-frame h2"), "Eager-loaded frame: Not Loaded")

  await scrollToSelector(page, "#eager-loaded-frame")
  await nextEventOnTarget(page, "eager-loaded-frame", "turbo:frame-load")

  assert.equal(await page.textContent("#eager-loaded-frame h2"), "Eager-loaded frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame_for_eager.html")
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

  assert.equal(await getFromLocalStorage(page, "beforeRenderUrl"), "/src/tests/fixtures/tabs/two.html")
  assert.equal(await getFromLocalStorage(page, "beforeRenderContent"), "One")

  await nextEventNamed(page, "turbo:frame-render")

  assert.equal(await pathname(page.url()), "/src/tests/fixtures/tabs/two.html")
  assert.equal(await page.textContent("#tab-content"), "Two")
})

test("promoted frame navigations are cached", async ({ page }) => {
  await page.goto("/src/tests/fixtures/tabs.html")

  await page.click("#tab-2")
  await nextEventOnTarget(page, "tab-frame", "turbo:frame-load")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("#tab-content"), "Two")
  assert.equal(pathname((await page.getAttribute("#tab-frame", "src")) || ""), "/src/tests/fixtures/tabs/two.html")
  assert.equal(await page.getAttribute("#tab-frame", "complete"), "", "sets [complete]")

  await page.click("#tab-3")
  await nextEventOnTarget(page, "tab-frame", "turbo:frame-load")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("#tab-content"), "Three")
  assert.equal(pathname((await page.getAttribute("#tab-frame", "src")) || ""), "/src/tests/fixtures/tabs/three.html")
  assert.equal(await page.getAttribute("#tab-frame", "complete"), "", "sets [complete]")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("#tab-content"), "Two")
  assert.equal(pathname((await page.getAttribute("#tab-frame", "src")) || ""), "/src/tests/fixtures/tabs/two.html")
  assert.equal(await page.getAttribute("#tab-frame", "complete"), "", "caches two.html with [complete]")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("#tab-content"), "One")
  assert.equal(await page.getAttribute("#tab-frame", "src"), null, "caches one.html without #tab-frame[src]")
  assert.equal(await page.getAttribute("#tab-frame", "complete"), null, "caches one.html without [complete]")
})

async function capturingRequestPathnames(page, callback) {
  const requestedPathnames = []

  page.on("request", (request) => requestedPathnames.push(pathname(request.url())))

  await callback()

  return requestedPathnames
}

async function delayResponseForLink(page, selector, delayInMilliseconds) {
  const href = await page.locator(selector).evaluate((link) => link.href)

  await page.route(href, async (route) => {
    await sleep(delayInMilliseconds)
    route.continue()
  })

  return page
}
