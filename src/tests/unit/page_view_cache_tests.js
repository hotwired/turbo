import { assert } from "@open-wc/testing"
import { PageView } from "../../core/drive/page_view"
import { PageSnapshot } from "../../core/drive/page_snapshot"

test("an explicit snapshot repairs a normal cache write already pending at the same location", async () => {
  let notifications = 0
  const view = createView(() => notifications++)
  const source = createSnapshot("Original")
  const location = new URL(view.lastRenderedLocation)
  const pending = view.cacheSnapshot(source)
  const repair = view.cacheSnapshotAtLocation(source, location)

  source.element.textContent = "Intermediate"
  location.pathname = "/changed-after-capture"

  assert.equal((await pending).element.textContent, "Intermediate")
  assert.equal((await repair).element.textContent, "Original")
  const cached = view.getCachedSnapshotForLocation(view.lastRenderedLocation)
  assert.equal(cached.element.textContent, "Original")
  assert.isUndefined(view.getCachedSnapshotForLocation(location))
  assert.equal(notifications, 1)
})

test("a completed frame snapshot wins over an intermediate normal cache write", async () => {
  const view = createView()
  const intermediate = createSnapshot("Intermediate")
  const pending = view.cacheSnapshot(intermediate, false)
  const finalSnapshot = createSnapshot("Advanced")
  const final = view.cacheSnapshotAtLocation(finalSnapshot, view.lastRenderedLocation)

  finalSnapshot.element.textContent = "Changed after capture"

  assert.equal((await pending).element.textContent, "Intermediate")
  assert.equal((await final).element.textContent, "Advanced")
  assert.equal(view.getCachedSnapshotForLocation(view.lastRenderedLocation).element.textContent, "Advanced")
})

test("normal caching notifies before returning and clones after the application cleanup tick", async () => {
  const events = []
  const snapshot = createSnapshot("Before cleanup")
  const clone = snapshot.clone.bind(snapshot)
  snapshot.clone = () => {
    events.push("clone")
    return clone()
  }
  const view = createView(() => {
    events.push("before-cache")
    setTimeout(() => {
      events.push("cleanup")
      snapshot.element.textContent = "After cleanup"
    }, 0)
  })

  const pending = view.cacheSnapshot(snapshot)
  events.push("returned")

  assert.deepEqual(events, ["before-cache", "returned"])
  assert.isUndefined(view.getCachedSnapshotForLocation(view.lastRenderedLocation))
  assert.equal((await pending).element.textContent, "After cleanup")
  assert.deepEqual(events, ["before-cache", "returned", "cleanup", "clone"])
})

test("normal clone failures reach the caller and do not block a later cache write", async () => {
  const view = createView()
  const snapshot = createSnapshot("Broken")
  const error = new Error("Cannot clone snapshot")
  snapshot.clone = () => {
    throw error
  }

  const failure = view.cacheSnapshot(snapshot).catch((error) => error)
  const recovery = view.cacheSnapshotAtLocation(createSnapshot("Recovered"), view.lastRenderedLocation)

  assert.strictEqual(await failure, error)
  await recovery
  assert.equal(view.getCachedSnapshotForLocation(view.lastRenderedLocation).element.textContent, "Recovered")
})

test("explicit clone failures reach the caller and do not block a later cache write", async () => {
  const view = createView()
  const snapshot = createSnapshot("Broken")
  const error = new Error("Cannot clone snapshot")
  snapshot.clone = () => {
    throw error
  }

  const failure = view.cacheSnapshotAtLocation(snapshot, view.lastRenderedLocation).catch((error) => error)
  const recovery = view.cacheSnapshot(createSnapshot("Recovered"), false)

  assert.strictEqual(await failure, error)
  await recovery
  assert.equal(view.getCachedSnapshotForLocation(view.lastRenderedLocation).element.textContent, "Recovered")
})

function createView(viewWillCacheSnapshot = () => {}) {
  const view = new PageView({ viewWillCacheSnapshot }, document.documentElement)
  view.lastRenderedLocation = new URL("/original", location.href)
  return view
}

function createSnapshot(text) {
  return PageSnapshot.fromHTMLString(`<html><head></head><body>${text}</body></html>`)
}
