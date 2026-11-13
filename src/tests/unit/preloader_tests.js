import { assert } from "@open-wc/testing"
import { PageSnapshot } from "../../core/drive/page_snapshot"
import { Preloader } from "../../core/drive/preloader"
import { SnapshotCache } from "../../core/drive/snapshot_cache"

test("preloading preserves a snapshot already cached by a visit", async () => {
  const { preloader, snapshotCache, request } = createPreloader()
  const snapshot = PageSnapshot.fromHTMLString("<body>Visited page</body>")
  snapshotCache.put(request.url, snapshot)

  await preloader.requestSucceededWithResponse(request, {
    responseHTML: Promise.resolve("<body>Preloaded page</body>")
  })

  assert.strictEqual(snapshotCache.get(request.url), snapshot)
})

test("preloading preserves a snapshot cached while the response body loads", async () => {
  const { preloader, snapshotCache, request } = createPreloader()
  let resolveResponse
  const responseHTML = new Promise((resolve) => (resolveResponse = resolve))
  const responseHandling = preloader.requestSucceededWithResponse(request, { responseHTML })
  const snapshot = PageSnapshot.fromHTMLString("<body>Visited page</body>")
  snapshotCache.put(request.url, snapshot)

  resolveResponse("<body>Preloaded page</body>")
  await responseHandling

  assert.strictEqual(snapshotCache.get(request.url), snapshot)
})

test("preloading caches the response when no snapshot has been saved", async () => {
  const { preloader, snapshotCache, request } = createPreloader()

  await preloader.requestSucceededWithResponse(request, {
    responseHTML: Promise.resolve("<body>Preloaded page</body>")
  })

  const snapshot = snapshotCache.get(request.url)
  assert.instanceOf(snapshot, PageSnapshot)
  assert.equal(snapshot.element.textContent, "Preloaded page")
})

test("preloading does not refill an empty cache cleared before response handling", async () => {
  const { preloader, snapshotCache, request } = createPreloader()
  snapshotCache.clear()

  await preloader.requestSucceededWithResponse(request, {
    responseHTML: Promise.resolve("<body>Before invalidation</body>")
  })

  assert.isFalse(snapshotCache.has(request.url))
})

test("preloading does not refill a cache cleared while the response body loads", async () => {
  const { preloader, snapshotCache, request } = createPreloader()
  let resolveResponse
  const responseHTML = new Promise((resolve) => (resolveResponse = resolve))
  const responseHandling = preloader.requestSucceededWithResponse(request, { responseHTML })

  // Model FetchRequest finishing before its delegate has read the body.
  preloader.requestFinished(request)
  snapshotCache.clear()
  resolveResponse("<body>Before invalidation</body>")
  await responseHandling

  assert.isFalse(snapshotCache.has(request.url))
})

test("a preload started after invalidation can populate the cache", async () => {
  const { preloader, snapshotCache, request } = createPreloader()
  snapshotCache.clear()

  const freshRequest = { url: request.url }
  preloader.requestStarted(freshRequest)
  await preloader.requestSucceededWithResponse(freshRequest, {
    responseHTML: Promise.resolve("<body>After invalidation</body>")
  })

  assert.equal(snapshotCache.get(request.url).element.textContent, "After invalidation")
})

test("a preload resumed after invalidation uses the cache state when its request starts", async () => {
  const { preloader, snapshotCache, request } = createPreloader()
  const resumedRequest = { url: request.url, headers: {} }
  preloader.prepareRequest(resumedRequest)
  snapshotCache.clear()
  preloader.requestStarted(resumedRequest)

  await preloader.requestSucceededWithResponse(resumedRequest, {
    responseHTML: Promise.resolve("<body>After resuming</body>")
  })

  assert.equal(snapshotCache.get(request.url).element.textContent, "After resuming")
})

test("evicting an unrelated snapshot does not invalidate a pending preload", async () => {
  const { preloader, snapshotCache, request } = createPreloader(1)
  snapshotCache.put(new URL("https://example.test/first"), PageSnapshot.fromHTMLString("<body>First</body>"))
  snapshotCache.put(new URL("https://example.test/second"), PageSnapshot.fromHTMLString("<body>Second</body>"))

  await preloader.requestSucceededWithResponse(request, {
    responseHTML: Promise.resolve("<body>Preloaded page</body>")
  })

  assert.equal(snapshotCache.get(request.url).element.textContent, "Preloaded page")
})

function createPreloader(size = 10) {
  const snapshotCache = new SnapshotCache(size)
  const preloader = new Preloader({}, snapshotCache)
  const request = { url: new URL("https://example.test/preloaded") }
  preloader.requestStarted(request)

  return {
    preloader,
    snapshotCache,
    request
  }
}
