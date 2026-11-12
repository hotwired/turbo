import { expect, test } from "@playwright/test"
import { nextBeat, nextEventOnTarget } from "../helpers/page"

test("preloads snapshot on initial load", async ({ page }) => {
  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
  await page.goto("/src/tests/fixtures/preloading.html")

  const preloadLink = await page.locator("#preload_anchor")
  const href = await preloadLink.evaluate((link) => link.href)

  expect(await urlInSnapshotCache(page, href)).toEqual(true)
})

test("preloading dispatch turbo:before-fetch-{request,response} events", async ({ page }) => {
  await page.goto("/src/tests/fixtures/preloading.html")

  const link = await page.locator("#preload_anchor")
  const href = await link.evaluate((link) => link.href)

  const { url, fetchOptions } = await nextEventOnTarget(page, "preload_anchor", "turbo:before-fetch-request")
  const { fetchResponse } = await nextEventOnTarget(page, "preload_anchor", "turbo:before-fetch-response")

  expect(href, "dispatches request during preloading").toEqual(url)
  expect(fetchOptions.headers.Accept).toEqual("text/html, application/xhtml+xml")
  expect(fetchResponse.response.url).toEqual(href)
})

test("preloads snapshot on page visit", async ({ page }) => {
  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloading.html"]`
  await page.goto("/src/tests/fixtures/hot_preloading.html")
  await page.click("#hot_preload_anchor")

  const preloadLink = await page.locator("#preload_anchor")
  const href = await preloadLink.evaluate((link) => link.href)

  expect(await urlInSnapshotCache(page, href)).toEqual(true)
})

test("preloads anchor from frame that will drive the page", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_preloading.html")
  await nextEventOnTarget(page, "menu", "turbo:frame-load")

  const preloadLink = await page.locator("#menu a[data-turbo-frame=_top]")
  const href = await preloadLink.evaluate((link) => link.href)

  expect(await urlInSnapshotCache(page, href)).toEqual(true)
})

test("does not preload anchor off-site", async ({ page }) => {
  await page.goto("/src/tests/fixtures/preloading.html")

  const link = await page.locator("a[href*=https]")
  const href = await link.evaluate((link) => link.href)

  expect(await urlInSnapshotCache(page, href)).toEqual(false)
})

test("does not preload anchor that will drive an ancestor frame", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_preloading.html")

  const preloadLink = await page.locator("#hello a[data-turbo-preload]")
  const href = await preloadLink.evaluate((link) => link.href)

  expect(await urlInSnapshotCache(page, href)).toEqual(false)
})

test("does not preload anchor that will drive a target frame", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_preloading.html")

  const link = await page.locator("a[data-turbo-frame=hello]")
  const href = await link.evaluate((link) => link.href)

  expect(await urlInSnapshotCache(page, href)).toEqual(false)
})

test("does not preload a link with [data-turbo=false]", async ({ page }) => {
  await page.goto("/src/tests/fixtures/preloading.html")

  const link = await page.locator("[data-turbo=false] a")
  const href = await link.evaluate((link) => link.href)

  expect(await urlInSnapshotCache(page, href)).toEqual(false)
})

test("does not preload a link with [data-turbo-method]", async ({ page }) => {
  await page.goto("/src/tests/fixtures/preloading.html")

  const preloadLink = await page.locator("a[data-turbo-method]")
  const href = await preloadLink.evaluate((link) => link.href)

  expect(await urlInSnapshotCache(page, href)).toEqual(false)
})

test("does not replace a snapshot cached while the preload was in flight", async ({ page }) => {
  let releaseResponse
  const responseHeld = new Promise((resolve) => (releaseResponse = resolve))

  await page.route("**/src/tests/fixtures/preloaded.html", async (route) => {
    await responseHeld
    await route.continue()
  })
  await page.goto("/src/tests/fixtures/preloading.html")

  const href = await page.locator("#preload_anchor").evaluate((link) => link.href)

  await page.evaluate((href) => {
    const { session } = window.Turbo
    const snapshot = session.view.snapshot.clone()

    snapshot.element.setAttribute("data-cached-by-visit", "")
    session.preloader.snapshotCache.put(new URL(href), snapshot)
  }, href)

  releaseResponse()
  await nextEventOnTarget(page, "preload_anchor", "turbo:before-fetch-response")
  await nextBeat()

  const cachedByVisit = await page.evaluate((href) => {
    const snapshot = window.Turbo.session.preloader.snapshotCache.get(new URL(href))

    return snapshot.element.hasAttribute("data-cached-by-visit")
  }, href)

  expect(cachedByVisit).toEqual(true)
})

function urlInSnapshotCache(page, href) {
  return page.evaluate((href) => {
    const preloadedUrl = new URL(href)
    const cache = window.Turbo.session.preloader.snapshotCache

    return cache.has(preloadedUrl)
  }, href)
}
