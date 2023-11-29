import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat } from "../helpers/page"

test("preloads snapshot on initial load", async ({ page }) => {
  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
  await page.goto("/src/tests/fixtures/preloading.html")
  await nextBeat()

  assert.ok(
    await page.evaluate(() => {
      const preloadedUrl = "http://localhost:9000/src/tests/fixtures/preloaded.html"
      const cache = window.Turbo.session.preloader.snapshotCache.snapshots

      return preloadedUrl in cache
    })
  )
})

test("preloads snapshot on page visit", async ({ page }) => {
  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloading.html"]`
  await page.goto("/src/tests/fixtures/hot_preloading.html")

  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
  await page.click("#hot_preload_anchor")
  await page.waitForSelector("#preload_anchor")
  await nextBeat()

  assert.ok(
    await page.evaluate(() => {
      const preloadedUrl = "http://localhost:9000/src/tests/fixtures/preloaded.html"
      const cache = window.Turbo.session.preloader.snapshotCache.snapshots

      return preloadedUrl in cache
    })
  )
})

test("navigates to preloaded snapshot from frame", async ({ page }) => {
  // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
  await page.goto("/src/tests/fixtures/frame_preloading.html")
  await page.waitForSelector("#frame_preload_anchor")
  await nextBeat()

  assert.ok(
    await page.evaluate(() => {
      const preloadedUrl = "http://localhost:9000/src/tests/fixtures/preloaded.html"
      const cache = window.Turbo.session.preloader.snapshotCache.snapshots

      return preloadedUrl in cache
    })
  )
})
