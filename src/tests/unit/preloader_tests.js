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

function createPreloader() {
  const snapshotCache = new SnapshotCache(10)

  return {
    preloader: new Preloader({}, snapshotCache),
    snapshotCache,
    request: { url: new URL("https://example.test/preloaded") }
  }
}
