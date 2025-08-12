import { test } from "@playwright/test"
import { assert } from "chai"
import { clearAllCaches, registerServiceWorker, unregisterServiceWorker, testFetch, waitForServiceWorkerToControl, getCachedResponse, setNetworkDelay } from "../helpers/offline"

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

  assert.equal(secondContent, firstContent, "Second request should return identical content from cache")
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

  assert.notEqual(secondContent, firstContent, "Second request should return different content from network")

  // The cached content should have been refreshed as well
  const cachedContentAfterSecondRequest = await getCachedContent(page, "test-network-first", dynamicTxtUrl)
  assert.notEqual(cachedContentAfterSecondRequest, firstContent, "Cached content should have changed")
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
  assert.equal(secondContent, firstContent, "Second request should return identical content from cache")

  // Now check that the cached content was refreshed
  await page.waitForTimeout(200)
  const cachedContentAfterSecondRequest = await getCachedContent(page, "test-stale-while-revalidate", dynamicTxtUrl)
  assert.notEqual(cachedContentAfterSecondRequest, firstContent, "Cached content should have changed")
})

test("doesn't intercept non-matching requests", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/cache_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicJsonUrl = "/__turbo/dynamic.json"

  // JSON endpoint doesn't match so it won't be cached
  const firstJsonResponse = await testFetch(page, dynamicJsonUrl)
  assert.equal(firstJsonResponse.ok, true)

  const firstJsonData = JSON.parse(firstJsonResponse.text)

  // Second request, not cached, would hit the network and get different content
  const secondJsonResponse = await testFetch(page, dynamicJsonUrl)
  assert.equal(secondJsonResponse.ok, true)

  const secondJsonData = JSON.parse(secondJsonResponse.text)

  assert.notEqual(secondJsonData.timestamp, firstJsonData.timestamp, "Timestamps should have changed")
  assert.notEqual(secondJsonData.requestId, firstJsonData.requestId, "Request IDs should be different")

  await assertNotCached(page, "test-cache-first", dynamicJsonUrl)
})

test("registers service worker as a module and intercepts and caches requests", async ({ page, browserName }) => {
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1360870
  test.skip(browserName === "firefox", "Firefox doesn't support ECMAScript modules in service workers")

  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/module.js", "/", "module")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  const firstContent = await fetchContent(page, dynamicTxtUrl)
  const secondContent = await fetchContent(page, dynamicTxtUrl)

  assert.equal(secondContent, firstContent, "Second request should return identical content from cache")
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
  assert.equal(notCachedTxtResponse.ok, true)
  await assertNotCached(page, "test-cache-first", dynamicTxtUrl)


  // Request with header - should be cached
  const cachedTxtContent = await fetchContent(page, dynamicTxtUrl, { "X-Cache": "yes" })
  await assertCachedContent(page, "test-cache-first", dynamicTxtUrl, cachedTxtContent)

  // Make the same request again - should return cached content
  const secondCachedTxtContent = await fetchContent(page, dynamicTxtUrl, { "X-Cache": "yes" })
  assert.equal(secondCachedTxtContent, cachedTxtContent, "Second request with header should return cached content")
})

test("network timeout triggers cache fallback for network-first", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/network_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  const initialContent = await fetchContent(page, dynamicTxtUrl)

  // Set a long delay that exceeds the network timeout configured in the network-first service worker
  await setNetworkDelay(page, 5000)

  const timeoutResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(timeoutResponse.ok, true, "Request should succeed from cache even on timeout")
  assert.equal(timeoutResponse.text.trim(), initialContent, "Timeout response should match cached content")
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
  assert.equal(secondTriggerTrimContent, firstTriggerTrimContent, "Second request should return identical content from cache")

  // Wait a bit for trimming to potentially complete
  await page.waitForTimeout(500)
  // And finally check that it's gone
  await assertNotCached(page, "test-cache-short-lived", triggerTrimUrl)
})

async function fetchContent(page, url, headers = {}) {
  const response = await testFetch(page, url, headers)
  assert.equal(response.ok, true)
  return response.text.trim()
}

async function getCachedContent(page, cacheName, url) {
  const fullUrl = "http://localhost:9000" + url
  const cachedResponse = await getCachedResponse(page, cacheName, fullUrl)
  assert.isTrue(cachedResponse.found)

  return cachedResponse.text.trim()
}

async function assertCachedContent(page, cacheName, url, expectedContent) {
  const cachedContent = await getCachedContent(page, cacheName, url)
  assert.equal(cachedContent, expectedContent, "Cached content should match expected content")
}

async function assertNotCached(page, cacheName, url) {
  const fullUrl = "http://localhost:9000" + url
  const cachedResponse = await getCachedResponse(page, cacheName, fullUrl)
  assert.isFalse(cachedResponse.found)
}
