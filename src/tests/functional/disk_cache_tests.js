import { test, expect } from "@playwright/test"
import { nextBody } from "../helpers/page"

const path = "/src/tests/fixtures/disk_cache.html"

test.beforeEach(async ({ page }) => {
  await page.goto(path)
})

test("stores pages in the disk cache", async ({ page }) => {
  await assertCachedURLs(page, [])

  page.click("#second-link")
  await nextBody(page)

  await assertCachedURLs(page, ["http://localhost:9000/src/tests/fixtures/disk_cache.html"])

  page.click("#third-link")
  await nextBody(page)

  await assertCachedURLs(page, [
    "http://localhost:9000/src/tests/fixtures/disk_cache.html",
    "http://localhost:9000/src/tests/fixtures/disk_cache.html?page=2"
  ])

  // Cache persists across reloads
  await page.reload()

  await assertCachedURLs(page, [
    "http://localhost:9000/src/tests/fixtures/disk_cache.html",
    "http://localhost:9000/src/tests/fixtures/disk_cache.html?page=2"
  ])
})

test("can clear the disk cache", async ({ page }) => {
  page.click("#second-link")
  await nextBody(page)

  await assertCachedURLs(page, ["http://localhost:9000/src/tests/fixtures/disk_cache.html"])

  page.click("#clear-cache")
  await assertCachedURLs(page, [])

  await page.reload()
  await assertCachedURLs(page, [])
})

const assertCachedURLs = async (page, urls) => {
  if (urls.length == 0) {
    await expect(page.locator("#caches")).toBeEmpty()
  } else {
    await Promise.all(
      urls.map((url) => {
        return expect(page.locator("#caches")).toContainText(url)
      })
    )
  }
}
