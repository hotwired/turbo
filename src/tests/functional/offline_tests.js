import { expect, test } from "@playwright/test"
import { clearAllCaches, registerServiceWorker, unregisterServiceWorker, testFetch, waitForServiceWorkerToControl, getCachedResponse, setNetworkDelay, setSimulateQuotaError, getIndexedDBEntryCount } from "../helpers/offline"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/bare.html")

  await clearAllCaches(page)
  await setNetworkDelay(page, 0)
})

test.afterEach(async ({ page }) => {
  await clearAllCaches(page)
  await unregisterServiceWorker(page)
  await setNetworkDelay(page, 0)
})

test("registers service worker and intercepts and caches requests with cache-first strategy", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  const firstContent = await fetchContent(page, dynamicTxtUrl)

  // Wait a bit for the response to be cached
  await page.waitForTimeout(200)

  await assertCachedContent(page, "test-cache-first", dynamicTxtUrl, firstContent)

  const secondContent = await fetchContent(page, dynamicTxtUrl)

  expect(secondContent).toBe(firstContent)
})

test("registers service worker and intercepts and caches requests with network-first strategy", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/network_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // First request to dynamic text file - should hit network and cache unique content
  const firstContent = await fetchContent(page, dynamicTxtUrl)

  // Wait a bit for the response to be cached
  await page.waitForTimeout(200)
  await assertCachedContent(page, "test-network-first", dynamicTxtUrl, firstContent)

  // Second request - should hit the network again
  const secondContent = await fetchContent(page, dynamicTxtUrl)

  expect(secondContent).not.toBe(firstContent)

  // The cached content should have been refreshed as well
  const cachedContentAfterSecondRequest = await getCachedContent(page, "test-network-first", dynamicTxtUrl)
  expect(cachedContentAfterSecondRequest).not.toBe(firstContent)
})

test("registers service worker and intercepts and caches requests with stale-while-revalidate strategy", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/stale_while_revalidate.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // First request to dynamic text file - should hit network and cache unique content
  const firstContent = await fetchContent(page, dynamicTxtUrl)

  // Wait a bit for the response to be cached
  await page.waitForTimeout(200)
  await assertCachedContent(page, "test-stale-while-revalidate", dynamicTxtUrl, firstContent)

  // Second request - should return the cached response but refresh it in the background
  const secondContent = await fetchContent(page, dynamicTxtUrl)
  expect(secondContent).toBe(firstContent)

  // Now check that the cached content was refreshed
  await page.waitForTimeout(200)
  const cachedContentAfterSecondRequest = await getCachedContent(page, "test-stale-while-revalidate", dynamicTxtUrl)
  expect(cachedContentAfterSecondRequest).not.toBe(firstContent)
})

test("doesn't intercept non-matching requests", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicJsonUrl = "/__turbo/dynamic.json"

  // JSON endpoint doesn't match so it won't be cached
  const firstJsonResponse = await testFetch(page, dynamicJsonUrl)
  expect(firstJsonResponse.ok).toBe(true)

  const firstJsonData = JSON.parse(firstJsonResponse.text)

  // Second request, not cached, would hit the network and get different content
  const secondJsonResponse = await testFetch(page, dynamicJsonUrl)
  expect(secondJsonResponse.ok).toBe(true)

  const secondJsonData = JSON.parse(secondJsonResponse.text)

  expect(secondJsonData.timestamp).not.toBe(firstJsonData.timestamp)
  expect(secondJsonData.requestId).not.toBe(firstJsonData.requestId)

  await assertNotCached(page, "test-cache-first", dynamicJsonUrl)
})

test("doesn't intercept requests matching the except pattern", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_first_with_exceptions.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"
  const dynamicJsonUrl = "/__turbo/dynamic.json"

  // .txt matches /\/dynamic\./ but not /\.json$/, so it should be cached
  const firstTxtContent = await fetchContent(page, dynamicTxtUrl)
  await page.waitForTimeout(200)
  await assertCachedContent(page, "test-cache-first-with-exceptions", dynamicTxtUrl, firstTxtContent)

  const secondTxtContent = await fetchContent(page, dynamicTxtUrl)
  expect(secondTxtContent).toBe(firstTxtContent)

  // .json matches /\/dynamic\./ but also matches /\.json$/ (except), so it should NOT be cached
  const firstJsonResponse = await testFetch(page, dynamicJsonUrl)
  expect(firstJsonResponse.ok).toBe(true)
  const firstJsonData = JSON.parse(firstJsonResponse.text)

  await page.waitForTimeout(200)
  await assertNotCached(page, "test-cache-first-with-exceptions", dynamicJsonUrl)

  const secondJsonResponse = await testFetch(page, dynamicJsonUrl)
  const secondJsonData = JSON.parse(secondJsonResponse.text)

  expect(secondJsonData.timestamp).not.toBe(firstJsonData.timestamp)
})

test("registers service worker as a module and intercepts and caches requests", async ({ page, browserName }) => {
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1360870
  test.skip(browserName === "firefox", "Firefox doesn't support ECMAScript modules in service workers")

  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/module.js", "/", "module")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  const firstContent = await fetchContent(page, dynamicTxtUrl)
  const secondContent = await fetchContent(page, dynamicTxtUrl)

  expect(secondContent).toBe(firstContent)
})

test("applies different handlers to different requests based on different rules", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/mixed_handlers_and_matchers.js")
  await waitForServiceWorkerToControl(page)

  // Cache-first for responses with X-Cache: yes header, and network-first for dynamic.json requests
  const dynamicTxtUrl = "/__turbo/dynamic.txt"
  const dynamicJsonUrl = "/__turbo/dynamic.json"

  // Request cached with network-first
  const jsonContent = await fetchContent(page, dynamicJsonUrl)
  await assertCachedContent(page, "test-network-first", dynamicJsonUrl, jsonContent)

  // Request without header - should NOT be cached
  const notCachedTxtResponse = await testFetch(page, dynamicTxtUrl)
  expect(notCachedTxtResponse.ok).toBe(true)
  await assertNotCached(page, "test-cache-first", dynamicTxtUrl)


  // Request with header - should be cached
  const cachedTxtContent = await fetchContent(page, dynamicTxtUrl, { "X-Cache": "yes" })
  await assertCachedContent(page, "test-cache-first", dynamicTxtUrl, cachedTxtContent)

  // Make the same request again - should return cached content
  const secondCachedTxtContent = await fetchContent(page, dynamicTxtUrl, { "X-Cache": "yes" })
  expect(secondCachedTxtContent).toBe(cachedTxtContent)
})

test("network timeout triggers cache fallback for network-first", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/network_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  const initialContent = await fetchContent(page, dynamicTxtUrl)

  // Set a long delay that exceeds the network timeout configured in the network-first service worker
  await setNetworkDelay(page, 5000)

  const timeoutResponse = await testFetch(page, dynamicTxtUrl)
  expect(timeoutResponse.ok).toBe(true)
  expect(timeoutResponse.text.trim()).toBe(initialContent)
})

test("deletes cached entries after maxAge per cache", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_trimming.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"
  const dynamicJsonUrl = "/__turbo/dynamic.json"

  // Cache in short-lived cache using (0.5 second maxAge)
  const shortLivedContent = await fetchContent(page, dynamicTxtUrl)

  // Cache in long-lived cache (5 minute maxAge)
  const longLivedContent = await fetchContent(page, dynamicJsonUrl)

  // Wait for caching to complete
  await page.waitForTimeout(200)

  // Verify both are cached
  await assertCachedContent(page, "test-cache-short-lived", dynamicTxtUrl, shortLivedContent)
  await assertCachedContent(page, "test-cache-stable", dynamicJsonUrl, longLivedContent)

  // Wait for the short-lived cache to expire (0.5 seconds + buffer)
  await page.waitForTimeout(750)

  // Make a request to a different URL to trigger caching (and therefore trimming)
  const triggerTrimUrl = "/__turbo/dynamic.txt?trigger=trim"
  const firstTriggerTrimContent = await fetchContent(page, triggerTrimUrl)

  // Wait a bit for trimming to potentially complete
  await page.waitForTimeout(500)

  // The expired short-lived entry should be removed
  await assertNotCached(page, "test-cache-short-lived", dynamicTxtUrl)

  // The long-lived cache should be unaffected
  await assertCachedContent(page, "test-cache-stable", dynamicJsonUrl, longLivedContent)

  // And now, request the last cached response in the short-lived cache, which will be expired, yet returned,
  // to trigger trimming as well
  // Wait a bit to ensure it has really expired
  await page.waitForTimeout(200)

  const secondTriggerTrimContent = await fetchContent(page, triggerTrimUrl)
  expect(secondTriggerTrimContent).toBe(firstTriggerTrimContent)

  // Wait a bit for trimming to potentially complete
  await page.waitForTimeout(500)
  // And finally check that it's gone
  await assertNotCached(page, "test-cache-short-lived", triggerTrimUrl)
})

test("clears all caches and IndexedDB when QuotaExceededError occurs", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/quota_error_simulation.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // First, cache something successfully
  await fetchContent(page, dynamicTxtUrl)
  await page.waitForTimeout(200)

  // Verify it's cached and IndexedDB has entries
  await assertCachedContent(page, "test-quota-error", dynamicTxtUrl, await fetchContent(page, dynamicTxtUrl))
  const entriesBefore = await getIndexedDBEntryCount(page)
  expect(entriesBefore).toBeGreaterThan(0)

  // Enable quota error simulation
  await setSimulateQuotaError(page, true)

  // Make another request that will trigger the quota error during caching
  const anotherUrl = "/__turbo/dynamic.txt?trigger=quota"
  await testFetch(page, anotherUrl)

  // Wait for error handling to complete
  await page.waitForTimeout(500)

  // Verify all caches are cleared
  const cacheNames = await page.evaluate(() => caches.keys())
  expect(cacheNames.length).toBe(0)

  // Verify IndexedDB is cleared
  const entriesAfter = await getIndexedDBEntryCount(page)
  expect(entriesAfter).toBe(0)
})

async function fetchContent(page, url, headers = {}) {
  const response = await testFetch(page, url, headers)
  expect(response.ok).toBe(true)
  return response.text.trim()
}

async function getCachedContent(page, cacheName, url) {
  const fullUrl = "http://localhost:9000" + url
  const cachedResponse = await getCachedResponse(page, cacheName, fullUrl)
  expect(cachedResponse.found).toBe(true)

  return cachedResponse.text.trim()
}

async function assertCachedContent(page, cacheName, url, expectedContent) {
  const cachedContent = await getCachedContent(page, cacheName, url)
  expect(cachedContent).toBe(expectedContent)
}

async function assertNotCached(page, cacheName, url) {
  const fullUrl = "http://localhost:9000" + url
  const cachedResponse = await getCachedResponse(page, cacheName, fullUrl)
  expect(cachedResponse.found).toBe(false)
}

// Range request tests for audio/video streaming support

test("returns 206 Partial Content for Range requests on cached responses", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // First, cache the content
  const fullContent = await fetchContent(page, dynamicTxtUrl)
  await page.waitForTimeout(200)

  // Now make a Range request for the first 5 bytes
  const rangeResponse = await testFetch(page, dynamicTxtUrl, { "Range": "bytes=0-4" })

  expect(rangeResponse.status).toBe(206)
  expect(rangeResponse.statusText).toBe("Partial Content")
  expect(rangeResponse.headers["content-range"]).toMatch(/^bytes 0-4\/\d+$/)
  expect(rangeResponse.headers["content-length"]).toBe("5")
  expect(rangeResponse.text).toBe(fullContent.substring(0, 5))
})

test("returns 206 for suffix Range requests (bytes=-N)", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // Cache the content
  const fullContent = await fetchContent(page, dynamicTxtUrl)
  await page.waitForTimeout(200)

  // Request last 5 bytes
  const rangeResponse = await testFetch(page, dynamicTxtUrl, { "Range": "bytes=-5" })

  expect(rangeResponse.status).toBe(206)
  expect(rangeResponse.text).toBe(fullContent.slice(-5))
})

test("returns 206 for open-ended Range requests (bytes=N-)", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // Cache the content
  const fullContent = await fetchContent(page, dynamicTxtUrl)
  await page.waitForTimeout(200)

  // Request from byte 5 to end
  const rangeResponse = await testFetch(page, dynamicTxtUrl, { "Range": "bytes=5-" })

  expect(rangeResponse.status).toBe(206)
  expect(rangeResponse.text).toBe(fullContent.substring(5))
})

test("returns 416 Range Not Satisfiable for invalid ranges", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // Cache the content (small content)
  await fetchContent(page, dynamicTxtUrl)
  await page.waitForTimeout(200)

  // Request a range way beyond the content size
  const rangeResponse = await testFetch(page, dynamicTxtUrl, { "Range": "bytes=99999-100000" })

  expect(rangeResponse.status).toBe(416)
  expect(rangeResponse.statusText).toBe("Range Not Satisfiable")
})

test("Range requests work with network-first strategy when falling back to cache", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/network_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // Cache content via network-first
  const fullContent = await fetchContent(page, dynamicTxtUrl)
  await page.waitForTimeout(200)

  // Set a long delay to force cache fallback
  await setNetworkDelay(page, 5000)

  // Make a Range request - should fall back to cache and return partial content
  const rangeResponse = await testFetch(page, dynamicTxtUrl, { "Range": "bytes=0-4" })

  expect(rangeResponse.status).toBe(206)
  expect(rangeResponse.text).toBe(fullContent.substring(0, 5))
})

// Cache limiting tests

test("trims oldest entries when maxEntries is exceeded", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/max_entries.js")
  await waitForServiceWorkerToControl(page)

  // Cache 5 different URLs with maxEntries: 3
  const urls = [
    "/__turbo/dynamic.txt?id=1",
    "/__turbo/dynamic.txt?id=2",
    "/__turbo/dynamic.txt?id=3",
    "/__turbo/dynamic.txt?id=4",
    "/__turbo/dynamic.txt?id=5"
  ]

  const contents = []
  for (const url of urls) {
    contents.push(await fetchContent(page, url))
    // Wait between requests to ensure distinct timestamps
    await page.waitForTimeout(100)
  }

  // Wait for trimming to complete
  await page.waitForTimeout(300)

  // The oldest 2 entries should be removed, leaving only the 3 newest
  await assertNotCached(page, "test-max-entries", urls[0])
  await assertNotCached(page, "test-max-entries", urls[1])
  await assertCachedContent(page, "test-max-entries", urls[2], contents[2])
  await assertCachedContent(page, "test-max-entries", urls[3], contents[3])
  await assertCachedContent(page, "test-max-entries", urls[4], contents[4])
})

test("rejects entries exceeding maxEntrySize", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/max_entry_size.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"
  const dynamicJsonUrl = "/__turbo/dynamic.json"

  // Fetch both URLs - txt responses are ~70 bytes, json are smaller
  await fetchContent(page, dynamicTxtUrl)
  const jsonContent = await fetchContent(page, dynamicJsonUrl)

  await page.waitForTimeout(200)

  // txt response (~70 bytes) exceeds maxEntrySize (50), should NOT be cached
  await assertNotCached(page, "test-max-entry-size", dynamicTxtUrl)

  // json response has larger maxEntrySize (500), should be cached
  await assertCachedContent(page, "test-max-entry-size-allowed", dynamicJsonUrl, jsonContent)
})

// Preloading tests

test("preloads resources loaded before service worker was active", async ({ page }) => {
  // Go to a page that loads scripts before calling Turbo.offline.start()
  await page.goto("/src/tests/fixtures/offline_preloading.html")

  // At this point, the scripts have been loaded but no SW is active
  // The scripts are in the performance API entries

  // Start offline with preload pattern - this should:
  // 1. Register the SW
  // 2. Wait for controllerchange
  // 3. Send preloadResources message with URLs matching the pattern
  await page.evaluate(async () => {
    await window.startOfflineWithPreload(/\/__turbo\/preload\//)
  })

  // Wait for the service worker to take control and preloading to complete
  await waitForServiceWorkerToControl(page)
  await page.waitForTimeout(500)

  // Verify the scripts that were loaded before SW activation are now cached
  const script1Url = "http://localhost:9000/__turbo/preload/script1.js"
  const script2Url = "http://localhost:9000/__turbo/preload/script2.js"

  const cached1 = await getCachedResponse(page, "test-preload", script1Url)
  const cached2 = await getCachedResponse(page, "test-preload", script2Url)

  expect(cached1.found).toBe(true)
  expect(cached2.found).toBe(true)
  expect(cached1.text).toContain("Preload test file: script1.js")
  expect(cached2.text).toContain("Preload test file: script2.js")
})

test("only preloads resources matching the pattern", async ({ page }) => {
  await page.goto("/src/tests/fixtures/offline_preloading.html")

  // Start with a pattern that only matches script1
  await page.evaluate(async () => {
    await window.startOfflineWithPreload(/script1\.js$/)
  })

  await waitForServiceWorkerToControl(page)
  await page.waitForTimeout(500)

  // Only script1 should be cached, not script2
  const script1Url = "http://localhost:9000/__turbo/preload/script1.js"
  const script2Url = "http://localhost:9000/__turbo/preload/script2.js"

  const cached1 = await getCachedResponse(page, "test-preload", script1Url)
  const cached2 = await getCachedResponse(page, "test-preload", script2Url)

  expect(cached1.found).toBe(true)
  expect(cached2.found).toBe(false)
})
