import { test } from "@playwright/test"
import { assert } from "chai"
import { clearAllCaches, getCacheStatus, registerServiceWorker, unregisterServiceWorker, testFetch, waitForServiceWorkerToControl, getCachedResponse, setNetworkDelay } from "../helpers/offline"

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

  const firstTxtResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(firstTxtResponse.ok, true)
  const firstContent = firstTxtResponse.text.trim()

  // Wait a bit for the response to be cached
  await page.waitForTimeout(200)

  // Check the cached content
  const fullUrl = "http://localhost:9000" + dynamicTxtUrl
  const cachedResponse = await getCachedResponse(page, "test-cache-first", fullUrl)
  assert.isTrue(cachedResponse.found)
  assert.equal(cachedResponse.text.trim(), firstContent, "Cached content should match first response")

  const secondTxtResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(secondTxtResponse.ok, true)
  const secondContent = secondTxtResponse.text.trim()

  assert.equal(secondContent, firstContent, "Second request should return identical content from cache")
})

test("registers service worker and intercepts and caches requests with network-first strategy", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/network_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // First request to dynamic text file - should hit network and cache unique content
  const firstTxtResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(firstTxtResponse.ok, true)
  const firstContent = firstTxtResponse.text.trim()

  // Check the cached content
  const fullUrl = "http://localhost:9000" + dynamicTxtUrl
  const cachedResponse = await getCachedResponse(page, "test-network-first", fullUrl)
  assert.isTrue(cachedResponse.found)
  assert.equal(cachedResponse.text.trim(), firstContent, "Cached content should match first response")

  // Second request - should hit the network again
  const secondTxtResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(secondTxtResponse.ok, true)
  const secondContent = secondTxtResponse.text.trim()

  assert.notEqual(secondContent, firstContent, "Second request should return different content from network")

  // The cached content should have been refreshed as well
  const cachedResponseAfterSecondRequest = await getCachedResponse(page, "test-network-first", fullUrl)
  assert.isTrue(cachedResponseAfterSecondRequest.found)
  assert.notEqual(cachedResponseAfterSecondRequest.text.trim(), cachedResponse.text.trim(), "Cached content should have changed")
})

test("registers service worker and intercepts and caches requests with stale-while-revalidate strategy", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/stale_while_revalidate.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  // First request to dynamic text file - should hit network and cache unique content
  const firstTxtResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(firstTxtResponse.ok, true)
  const firstContent = firstTxtResponse.text.trim()

  // Check the cached content
  const fullUrl = "http://localhost:9000" + dynamicTxtUrl
  const cachedResponse = await getCachedResponse(page, "test-stale-while-revalidate", fullUrl)
  assert.isTrue(cachedResponse.found)
  assert.equal(cachedResponse.text.trim(), firstContent, "Cached content should match first response")

  // Second request - should return the cached response but refresh it in the background
  const secondTxtResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(secondTxtResponse.ok, true)
  const secondContent = secondTxtResponse.text.trim()

  assert.equal(secondContent, firstContent, "Second request should return identical content from cache")

  // Now check that the cached content was refreshed
  await page.waitForTimeout(200)
  const cachedResponseAfterSecondRequest = await getCachedResponse(page, "test-stale-while-revalidate", fullUrl)
  assert.isTrue(cachedResponseAfterSecondRequest.found)
  assert.notEqual(cachedResponseAfterSecondRequest.text.trim(), cachedResponse.text.trim(), "Cached content should have changed")
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

  const cacheStatus = await getCacheStatus(page)

  // Should not have our test cache since no matching requests were made
  assert.isFalse(Object.keys(cacheStatus).includes("test-cache-first"), "Test cache should not exist for non-matching requests")
})

test("registers service worker as a module and intercepts and caches requests", async ({ page, browserName }) => {
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1360870
  test.skip(browserName === "firefox", "Firefox doesn't support ECMAScript modules in service workers");

  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/module.js", "/", "module")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  const firstTxtResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(firstTxtResponse.ok, true)
  const firstContent = firstTxtResponse.text.trim()

  const secondTxtResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(secondTxtResponse.ok, true)
  const secondContent = secondTxtResponse.text.trim()

  assert.equal(secondContent, firstContent, "Second request should return identical content from cache")
})

test("network timeout triggers cache fallback", async ({ page }) => {
  await registerServiceWorker(page, "/src/tests/fixtures/service_workers/network_first.js")
  await waitForServiceWorkerToControl(page)

  const dynamicTxtUrl = "/__turbo/dynamic.txt"

  const initialResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(initialResponse.ok, true)
  const initialContent = initialResponse.text.trim()

  // Set a long delay that exceeds the network timeout (2 seconds)
  await setNetworkDelay(page, 5000)

  const timeoutResponse = await testFetch(page, dynamicTxtUrl)
  assert.equal(timeoutResponse.ok, true, "Request should succeed from cache even on timeout")
  assert.equal(timeoutResponse.text.trim(), initialContent, "Timeout response should match cached content")
})

