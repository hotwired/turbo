import { expect, test } from "@playwright/test"
import { nextEventNamed } from "../helpers/page"

test("caches snapshot after rendering completes to avoid element duplication", async ({ page }) => {
  // This test verifies the fix for https://github.com/hotwired/turbo/issues/1397
  //
  // The bug: cacheSnapshot() is called without being awaited (visit.js), so it
  // runs concurrently with rendering. Components like Stimulus controllers use
  // MutationObserver to detect when their elements are removed from the DOM and
  // clean up accordingly. Without waiting for the render to complete before
  // cloning, snapshot.clone() could capture the DOM before cleanup completes,
  // causing component elements to be duplicated when restoring from cache.
  //
  // The fix: cacheSnapshot() now awaits renderPromise before cloning, ensuring
  // the DOM is in a consistent state after render and cleanup complete.

  await page.goto("/src/tests/fixtures/cache_racing.html")
  await nextEventNamed(page, "turbo:load")

  // Verify component mounted exactly once
  await expect(page.locator("#component-output")).toHaveCount(1)
  await expect(page.locator("#component-output")).toHaveText("Hello from component")

  // Navigate to a page with different <head> content (triggers the race condition)
  await page.click("#link-to-page-with-different-head")
  await nextEventNamed(page, "turbo:load")

  // Go back - the page should be restored from cache
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  // The component should appear exactly once, not duplicated
  await expect(page.locator("#component-output")).toHaveCount(1)
  await expect(page.locator("#component-output")).toHaveText("Hello from component")
})
