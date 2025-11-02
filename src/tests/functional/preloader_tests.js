import { test } from "@playwright/test"
import { assert } from "chai"
import { nextEventOnTarget } from "../helpers/page"

test("preloads snapshot on initial load", async ({ page }) => {
  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
  await page.goto("/src/tests/fixtures/preloading.html")

  const preloadLink = await page.locator("#preload_anchor")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.ok(await urlInSnapshotCache(page, href))
})

test("preloading dispatch turbo:before-fetch-{request,response} events", async ({ page }) => {
  await page.goto("/src/tests/fixtures/preloading.html")

  const link = await page.locator("#preload_anchor")
  const href = await link.evaluate((link) => link.href)

  const { request } = await nextEventOnTarget(page, "preload_anchor", "turbo:before-fetch-request")
  const { response } = await nextEventOnTarget(page, "preload_anchor", "turbo:before-fetch-response")

  assert.equal(href, request.url, "dispatches request during preloading")
  assert.equal(request.headers.accept, "text/html, application/xhtml+xml")
  assert.equal(response.url, href)
})

test("preloads snapshot on page visit", async ({ page }) => {
  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloading.html"]`
  await page.goto("/src/tests/fixtures/hot_preloading.html")
  await page.click("#hot_preload_anchor")

  const preloadLink = await page.locator("#preload_anchor")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.ok(await urlInSnapshotCache(page, href))
})

test("preloads anchor from frame that will drive the page", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_preloading.html")
  await nextEventOnTarget(page, "menu", "turbo:frame-load")

  const preloadLink = await page.locator("#menu a[data-turbo-frame=_top]")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.ok(await urlInSnapshotCache(page, href))
})

test("does not preload anchor off-site", async ({ page }) => {
  await page.goto("/src/tests/fixtures/preloading.html")

  const link = await page.locator("a[href*=https]")
  const href = await link.evaluate((link) => link.href)

  assert.notOk(await urlInSnapshotCache(page, href))
})

test("does not preload anchor that will drive an ancestor frame", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_preloading.html")

  const preloadLink = await page.locator("#hello a[data-turbo-preload]")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.notOk(await urlInSnapshotCache(page, href))
})

test("does not preload anchor that will drive a target frame", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_preloading.html")

  const link = await page.locator("a[data-turbo-frame=hello]")
  const href = await link.evaluate((link) => link.href)

  assert.notOk(await urlInSnapshotCache(page, href))
})

test("does not preload a link with [data-turbo=false]", async ({ page }) => {
  await page.goto("/src/tests/fixtures/preloading.html")

  const link = await page.locator("[data-turbo=false] a")
  const href = await link.evaluate((link) => link.href)

  assert.notOk(await urlInSnapshotCache(page, href))
})

test("does not preload a link with [data-turbo-method]", async ({ page }) => {
  await page.goto("/src/tests/fixtures/preloading.html")

  const preloadLink = await page.locator("a[data-turbo-method]")
  const href = await preloadLink.evaluate((link) => link.href)

  assert.notOk(await urlInSnapshotCache(page, href))
})

function urlInSnapshotCache(page, href) {
  return page.evaluate((href) => {
    const preloadedUrl = new URL(href)
    const cache = window.Turbo.session.preloader.snapshotCache

    return cache.has(preloadedUrl)
  }, href)
}
