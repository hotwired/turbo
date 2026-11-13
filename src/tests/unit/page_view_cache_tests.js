import { assert } from "@open-wc/testing"
import { PageView } from "../../core/drive/page_view"
import { PageSnapshot } from "../../core/drive/page_snapshot"
import { PageRenderer } from "../../core/drive/page_renderer"

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

for (const renderMethod of ["morph", "replace"]) {
  test(`a custom ${renderMethod} render preserves the snapshot before mutating the same body`, async () => {
    const { view, snapshot, pageDocument } = createConnectedPage()
    const caching = view.cacheSnapshot(snapshot)
    const renderer = createPageRenderer(pageDocument, (body) => {
      body.querySelector("h1").textContent = "Updated in place"
    })
    renderer.renderMethod = renderMethod

    await view.render(renderer)
    await caching

    assert.equal(pageDocument.body.querySelector("h1").textContent, "Updated in place")
    assert.equal(view.getCachedSnapshotForLocation(view.lastRenderedLocation).element.querySelector("h1").textContent, "Original")
  })
}

test("a delayed body replacement keeps the initial cache available and then captures disconnect cleanup", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  const preparing = deferred()
  const release = deferred()
  let notifications = 0
  view.delegate.viewWillCacheSnapshot = () => notifications++
  const observer = observeRemovedBody(snapshot.element, pageDocument)
  const renderer = createPageRenderer(pageDocument, (body, newBody) => body.replaceWith(newBody))
  renderer.prepareToRender = async () => {
    preparing.resolve()
    await release.promise
  }
  const caching = view.cacheSnapshot(snapshot)
  const rendering = view.render(renderer)

  try {
    await preparing.promise
    const initial = await caching
    assert.strictEqual(view.snapshotCache.get(view.lastRenderedLocation), initial)
    assert.isTrue(snapshot.isConnected)
    assert.exists(initial.element.querySelector("#widget"))

    release.resolve()
    await rendering

    const repaired = view.getCachedSnapshotForLocation(view.lastRenderedLocation)
    assert.equal(repaired.element.querySelector("h1").textContent, "Original")
    assert.equal(repaired.element.querySelector("input").value, "Unsaved")
    assert.notExists(repaired.element.querySelector("#widget"))
    assert.equal(pageDocument.body.textContent, "Destination")
    assert.equal(notifications, 1)
  } finally {
    release.resolve()
    await rendering
    observer.disconnect()
  }
})

test("a replacement before the initial capture includes disconnect cleanup with one clone", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  const observer = observeRemovedBody(snapshot.element, pageDocument)
  const clone = snapshot.clone.bind(snapshot)
  let clones = 0
  snapshot.clone = () => {
    clones++
    return clone()
  }
  const renderer = createPageRenderer(pageDocument)
  // Preserve the default function identity without invoking its global-document
  // implementation: this renderer replaces only the isolated test document.
  renderer.renderElement = PageRenderer.renderElement
  renderer.render = () => renderer.currentElement.replaceWith(renderer.newSnapshot.element)
  const caching = view.cacheSnapshot(snapshot)

  try {
    await view.render(renderer)
    const cached = await caching

    assert.notExists(cached.element.querySelector("#widget"))
    assert.equal(cached.element.querySelector("input").value, "Unsaved")
    assert.equal(clones, 1)
  } finally {
    observer.disconnect()
  }
})

for (const operation of ["a newer snapshot", "a cache clear"]) {
  test(`a late disconnect repair respects ${operation} while its renderer is pending`, async () => {
    const { view, snapshot, pageDocument } = createConnectedPage()
    await view.cacheSnapshot(snapshot)
    const replaced = deferred()
    const release = deferred()
    const renderer = createPageRenderer(pageDocument, async (body, newBody) => {
      body.replaceWith(newBody)
      replaced.resolve()
      await release.promise
    })
    const rendering = view.render(renderer)

    try {
      await replaced.promise
      let replacement
      if (operation === "a newer snapshot") {
        replacement = view.cacheSnapshotAtLocation(createSnapshot("Newer"), view.lastRenderedLocation)
      } else {
        view.clearSnapshotCache()
      }
      release.resolve()
      await rendering

      if (replacement) {
        assert.strictEqual(view.snapshotCache.get(view.lastRenderedLocation), await replacement)
        assert.equal(view.getCachedSnapshotForLocation(view.lastRenderedLocation).element.textContent, "Newer")
      } else {
        assert.isUndefined(view.getCachedSnapshotForLocation(view.lastRenderedLocation))
      }
    } finally {
      release.resolve()
      await rendering
    }
  })
}

test("a non-rendering visit does not wait for or repeat its initial capture", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  const clone = snapshot.clone.bind(snapshot)
  let clones = 0
  snapshot.clone = () => {
    clones++
    return clone()
  }
  const caching = view.cacheSnapshot(snapshot)
  const renderer = createPageRenderer(pageDocument, () => assert.fail("must not render"))
  renderer.willRender = false

  await view.render(renderer)
  assert.equal(clones, 0)
  await caching
  assert.equal(clones, 1)
  assert.isTrue(snapshot.isConnected)

  pageDocument.body.querySelector("h1").textContent = "Changed after the non-rendering visit"
  await view.render(createPageRenderer(pageDocument, (body, newBody) => body.replaceWith(newBody)))

  assert.equal(clones, 1)
  assert.equal(view.getCachedSnapshotForLocation(view.lastRenderedLocation).element.querySelector("h1").textContent, "Original")
})

test("an initial capture failure reaches its caller without preventing the render", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  const error = new Error("Cannot capture the page")
  snapshot.clone = () => { throw error }
  const caching = view.cacheSnapshot(snapshot).catch((error) => error)

  await view.render(createPageRenderer(pageDocument, (body, newBody) => body.replaceWith(newBody)))

  assert.strictEqual(await caching, error)
  assert.equal(pageDocument.body.textContent, "Destination")
  assert.isUndefined(view.getCachedSnapshotForLocation(view.lastRenderedLocation))
})

test("a disconnect repair failure does not replace the original render error", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  const initial = await view.cacheSnapshot(snapshot)
  const renderError = new Error("Cannot finish rendering")
  const repairError = new Error("Cannot repair the snapshot")
  snapshot.clone = () => { throw repairError }
  const reported = []
  const reportError = console.error
  console.error = (...args) => reported.push(args.find((argument) => argument instanceof Error))

  try {
    const renderer = createPageRenderer(pageDocument, (body, newBody) => {
      body.replaceWith(newBody)
      throw renderError
    })
    const failure = await view.render(renderer).catch((error) => error)

    assert.strictEqual(failure, renderError)
    assert.deepEqual(reported, [repairError])
    assert.strictEqual(view.snapshotCache.get(view.lastRenderedLocation), initial)
  } finally {
    console.error = reportError
  }
})

test("clearing the cache drops the pending repair context of a still-connected body", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  const clone = snapshot.clone.bind(snapshot)
  let clones = 0
  snapshot.clone = () => {
    clones++
    return clone()
  }
  await view.cacheSnapshot(snapshot)

  view.clearSnapshotCache()
  await view.render(createPageRenderer(pageDocument, (body, newBody) => body.replaceWith(newBody)))

  assert.equal(clones, 1)
  assert.isUndefined(view.getCachedSnapshotForLocation(view.lastRenderedLocation))
})

test("a morph waits for a newer capture requested by before-render", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  await view.cacheSnapshot(snapshot)
  let latestCapture
  view.delegate.allowsImmediateRender = () => {
    latestCapture = view.cacheSnapshot(snapshot)
    return true
  }
  const renderer = createPageRenderer(pageDocument, (body) => {
    body.querySelector("h1").textContent = "Morphed"
  })
  renderer.renderMethod = "morph"

  await view.render(renderer)
  const cached = await latestCapture

  assert.equal(pageDocument.body.querySelector("h1").textContent, "Morphed")
  assert.equal(cached.element.querySelector("h1").textContent, "Original")
  assert.strictEqual(view.snapshotCache.get(view.lastRenderedLocation), cached)
})

test("a paused default replacement repairs the newer capture requested by before-render", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  const initial = await view.cacheSnapshot(snapshot)
  const intercepted = deferred()
  const observer = observeRemovedBody(snapshot.element, pageDocument)
  let latestCapture, resume
  view.delegate.allowsImmediateRender = (_snapshot, options) => {
    latestCapture = view.cacheSnapshot(snapshot)
    resume = options.resume
    intercepted.resolve()
    return false
  }
  const renderer = createPageRenderer(pageDocument)
  renderer.renderElement = PageRenderer.renderElement
  renderer.render = () => renderer.currentElement.replaceWith(renderer.newSnapshot.element)
  const rendering = view.render(renderer)

  try {
    await intercepted.promise
    const latest = await latestCapture
    assert.notStrictEqual(latest, initial)
    assert.exists(latest.element.querySelector("#widget"))

    resume()
    await rendering

    const repaired = view.snapshotCache.get(view.lastRenderedLocation)
    assert.notStrictEqual(repaired, latest)
    assert.notExists(repaired.element.querySelector("#widget"))
    assert.equal(repaired.element.querySelector("h1").textContent, "Original")
  } finally {
    resume?.()
    await rendering
    observer.disconnect()
  }
})

test("a repair does not overwrite a newer write queued reentrantly while cloning", async () => {
  const { view, snapshot, pageDocument } = createConnectedPage()
  const initial = await view.cacheSnapshot(snapshot)
  const clone = snapshot.clone.bind(snapshot)
  let replacement, entryWhileCloning
  snapshot.clone = () => {
    const repaired = clone()
    replacement = view.cacheSnapshotAtLocation(createSnapshot("Newer"), view.lastRenderedLocation)
    entryWhileCloning = view.snapshotCache.get(view.lastRenderedLocation)
    return repaired
  }

  await view.render(createPageRenderer(pageDocument, (body, newBody) => body.replaceWith(newBody)))

  assert.exists(replacement)
  assert.strictEqual(entryWhileCloning, initial)
  assert.strictEqual(view.snapshotCache.get(view.lastRenderedLocation), await replacement)
  assert.equal(view.getCachedSnapshotForLocation(view.lastRenderedLocation).element.textContent, "Newer")
})

test("a no-cache capture drops the old repair context without changing its cached entry", async () => {
  const { view, pageDocument } = createConnectedPage()
  const initial = await view.cacheSnapshot()
  const meta = pageDocument.createElement("meta")
  meta.name = "turbo-cache-control"
  meta.content = "no-cache"
  pageDocument.head.append(meta)

  assert.isUndefined(await view.cacheSnapshot())
  pageDocument.body.querySelector("h1").textContent = "Changed after opting out of caching"
  await view.render(createPageRenderer(pageDocument, (body, newBody) => body.replaceWith(newBody)))

  assert.strictEqual(view.snapshotCache.get(view.lastRenderedLocation), initial)
  assert.equal(view.getCachedSnapshotForLocation(view.lastRenderedLocation).element.querySelector("h1").textContent, "Original")
})

function createView(viewWillCacheSnapshot = () => {}) {
  const view = new PageView({ viewWillCacheSnapshot }, document.documentElement)
  view.lastRenderedLocation = new URL("/original", location.href)
  return view
}

function createSnapshot(text) {
  return PageSnapshot.fromHTMLString(`<html><head></head><body>${text}</body></html>`)
}

function createConnectedPage() {
  const pageDocument = document.implementation.createHTMLDocument()
  pageDocument.body.innerHTML = '<h1>Original</h1><input><p id="widget">Transient widget</p>'
  pageDocument.querySelector("input").value = "Unsaved"
  const view = new PageView({
    viewWillCacheSnapshot() {},
    allowsImmediateRender: () => true,
    viewRenderedSnapshot() {},
    preloadOnLoadLinksForView() {}
  }, pageDocument.documentElement)
  view.lastRenderedLocation = new URL("/original", location.href)
  return { view, pageDocument, snapshot: PageSnapshot.fromDocument(pageDocument) }
}

function createPageRenderer(pageDocument, renderElement = () => {}) {
  const nextBody = pageDocument.createElement("body")
  nextBody.textContent = "Destination"
  return {
    currentElement: pageDocument.body,
    newSnapshot: { element: nextBody },
    isPreview: false,
    shouldRender: true,
    willRender: true,
    renderMethod: "replace",
    renderElement,
    prepareToRender() {},
    async render() {
      if (this.willRender) await this.renderElement(this.currentElement, nextBody)
    },
    finishRendering() {}
  }
}

function observeRemovedBody(body, pageDocument) {
  const observer = new MutationObserver(() => {
    if (!body.isConnected) {
      body.querySelector("#widget")?.remove()
      observer.disconnect()
    }
  })
  observer.observe(pageDocument.documentElement, { childList: true })
  return observer
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => resolve = resolvePromise)
  return { promise, resolve }
}
