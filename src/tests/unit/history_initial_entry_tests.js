import { assert } from "@open-wc/testing"
import { History } from "../../core/drive/history"

for (const [description, state] of [["null", null], ["application", { router: "initial" }]]) {
  test(`starting on an entry with ${description} state does not write history`, () => {
    withHistory(state, ({ controller, writes, entry }) => {
      const restorationIdentifier = controller.restorationIdentifier

      controller.start()

      assert.deepEqual(writes, [])
      assert.strictEqual(window.history.state, state)
      assert.equal(window.navigation.currentEntry.id, entry.id)
      assert.equal(controller.location.href, window.location.href)
      assert.equal(controller.restorationIdentifier, restorationIdentifier)
      assert.equal(controller.currentIndex, 0)
      assert.equal(controller.entryDocumentIdentifier, controller.renderedDocumentIdentifier)
    })
  })
}

test("pushing preserves the initial entry and popping restores its metadata and scroll", () => {
  withHistory(null, ({ controller, writes, entry, setEntry, popped }) => {
    controller.start()
    const restorationIdentifier = controller.restorationIdentifier
    const documentIdentifier = controller.renderedDocumentIdentifier
    const scrollPosition = { x: 0, y: 240 }
    controller.updateRestorationData({ scrollPosition })

    controller.push(new URL("/pushed", window.location.href), "pushed-restoration")

    assert.deepEqual(writes.map(({ method }) => method), ["push"])
    assert.isNull(entry.state)
    assert.equal(controller.currentIndex, 1)
    assert.equal(window.history.state.turbo.restorationIdentifier, "pushed-restoration")
    assert.equal(window.history.state.turbo.restorationIndex, 1)
    assert.notEqual(controller.entryDocumentIdentifier, documentIdentifier)

    setEntry(entry)
    controller.onPopState({ state: entry.state })

    assert.equal(writes.length, 1)
    assert.equal(controller.restorationIdentifier, restorationIdentifier)
    assert.equal(controller.currentIndex, 0)
    assert.equal(controller.entryDocumentIdentifier, documentIdentifier)
    assert.deepEqual(controller.getRestorationDataForIdentifier(restorationIdentifier), { scrollPosition })
    assert.deepEqual(popped, [{
      location: controller.location,
      restorationIdentifier,
      direction: "back",
      isSameDocument: false
    }])
  })
})

test("restarting preserves a known entry and assigns a separate identity to another entry", () => {
  withHistory(null, ({ controller, writes, entry, setEntry }) => {
    controller.start()
    const restorationIdentifier = controller.restorationIdentifier
    const documentIdentifier = controller.entryDocumentIdentifier
    const scrollPosition = { x: 0, y: 120 }
    controller.updateRestorationData({ scrollPosition })

    controller.stop()
    controller.start()

    assert.equal(controller.restorationIdentifier, restorationIdentifier)
    assert.equal(controller.entryDocumentIdentifier, documentIdentifier)
    assert.deepEqual(controller.getRestorationDataForIdentifier(controller.restorationIdentifier), { scrollPosition })

    controller.stop()
    setEntry({ ...entry, id: "another-entry" })
    controller.start()

    assert.notEqual(controller.restorationIdentifier, restorationIdentifier)
    assert.deepEqual(controller.getRestorationDataForIdentifier(controller.restorationIdentifier), {})

    controller.stop()
    setEntry(entry)
    controller.start()

    assert.equal(controller.restorationIdentifier, restorationIdentifier)
    assert.equal(controller.entryDocumentIdentifier, documentIdentifier)
    assert.deepEqual(controller.getRestorationDataForIdentifier(controller.restorationIdentifier), { scrollPosition })
    assert.deepEqual(writes, [])
  })
})

test("another entry at the same URL with the same key does not restore the initial entry", () => {
  withHistory(null, ({ controller, writes, entry, setEntry, popped, emptyPops }) => {
    controller.start()
    const restorationIdentifier = controller.restorationIdentifier
    setEntry({ ...entry, id: "replacement-entry" })

    controller.onPopState({ state: null })

    assert.deepEqual(popped, [])
    assert.deepEqual(emptyPops, [controller.location])
    assert.notEqual(controller.restorationIdentifier, restorationIdentifier)
    assert.equal(controller.currentIndex, 1)
    assert.deepEqual(writes.map(({ method }) => method), ["replace"])
    assert.equal(window.navigation.currentEntry.key, entry.key)
    assert.equal(window.history.state.turbo.restorationIdentifier, controller.restorationIdentifier)
  })
})

test("starting with Turbo state still writes the entry and preserves its metadata", () => {
  const state = {
    router: "initial",
    turbo: { restorationIdentifier: "existing", restorationIndex: 4, documentIdentifier: "existing-document", extra: true }
  }

  withHistory(state, ({ controller, writes }) => {
    controller.start()

    assert.deepEqual(writes.map(({ method }) => method), ["replace"])
    assert.deepEqual(window.history.state, state)
    assert.equal(controller.restorationIdentifier, "existing")
    assert.equal(controller.currentIndex, 4)
    assert.equal(controller.entryDocumentIdentifier, "existing-document")
    assert.equal(controller.renderedDocumentIdentifier, "existing-document")
  })
})

test("legacy Turbo entries are migrated on start and pop while preserving application state", () => {
  const state = { router: "initial", turbo: { restorationIdentifier: "initial", restorationIndex: 2, extra: true } }

  withHistory(state, ({ controller, writes, setEntry, popped, emptyPops }) => {
    controller.start()

    assert.equal(writes.length, 1)
    assert.deepEqual(window.history.state, {
      ...state,
      turbo: { ...state.turbo, documentIdentifier: controller.renderedDocumentIdentifier }
    })

    const previousState = { router: "previous", turbo: { restorationIdentifier: "previous", restorationIndex: 1 } }
    setEntry({ id: "previous-entry", key: "previous-key", state: previousState })
    controller.onPopState({ state: previousState })

    assert.deepEqual(writes.map(({ method }) => method), ["replace", "replace"])
    assert.deepEqual(window.history.state, {
      ...previousState,
      turbo: { ...previousState.turbo, documentIdentifier: controller.entryDocumentIdentifier }
    })
    assert.equal(controller.restorationIdentifier, "previous")
    assert.equal(controller.currentIndex, 1)
    assert.isString(controller.entryDocumentIdentifier)
    assert.notEqual(controller.entryDocumentIdentifier, controller.renderedDocumentIdentifier)
    assert.deepEqual(emptyPops, [])
    assert.deepEqual(popped, [{
      location: controller.location,
      restorationIdentifier: "previous",
      direction: "back",
      isSameDocument: false
    }])
  })
})

test("starting without the Navigation API writes the initial entry as before", () => {
  const state = { router: "initial" }

  withHistory(state, ({ controller, writes }) => {
    const restorationIdentifier = controller.restorationIdentifier
    controller.start()

    assert.deepEqual(writes.map(({ method }) => method), ["replace"])
    assert.deepEqual(window.history.state, {
      ...state,
      turbo: { restorationIdentifier, restorationIndex: 0, documentIdentifier: controller.renderedDocumentIdentifier }
    })
    assert.equal(controller.restorationIdentifier, restorationIdentifier)
  }, { hasNavigation: false })
})

function withHistory(state, run, { hasNavigation = true } = {}) {
  const entry = { id: "initial-entry", key: "initial-key", state }
  let currentEntry = entry
  const writes = []
  const popped = []
  const emptyPops = []
  const controller = new History({
    historyPoppedToLocationWithRestorationIdentifierAndDirection(location, restorationIdentifier, direction, isSameDocument) {
      popped.push({ location, restorationIdentifier, direction, isSameDocument })
    },
    historyPoppedWithEmptyState(location) {
      emptyPops.push(location)
    }
  })
  const properties = [
    [window.history, "state", { get: () => currentEntry.state }],
    [window.history, "pushState", { value: (state, _title, url) => write("push", state, url) }],
    [window.history, "replaceState", { value: (state, _title, url) => write("replace", state, url) }],
    [window, "navigation", { value: hasNavigation ? { get currentEntry() { return currentEntry } } : undefined }]
  ]
  const originals = properties.map(([object, name]) => Object.getOwnPropertyDescriptor(object, name))

  try {
    for (const [object, name, descriptor] of properties) {
      Object.defineProperty(object, name, { configurable: true, ...descriptor })
    }
    run({ controller, writes, entry, popped, emptyPops, setEntry: (entry) => currentEntry = entry })
  } finally {
    controller.stop()
    for (const [index, [object, name]] of properties.entries()) {
      const original = originals[index]
      if (original) {
        Object.defineProperty(object, name, original)
      } else {
        delete object[name]
      }
    }
  }

  function write(method, state, url) {
    writes.push({ method, state, url })
    currentEntry = {
      id: `entry-${writes.length}`,
      key: method === "push" ? `key-${writes.length}` : currentEntry.key,
      state
    }
  }
}
