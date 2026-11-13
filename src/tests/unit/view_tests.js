import { assert } from "@open-wc/testing"
import { View } from "../../core/view"

test("renders waiting for the same previous render run in order and finish their own promises", async () => {
  const events = []
  const view = createView()
  const firstStarted = deferred()
  const releaseFirst = deferred()
  const secondStarted = deferred()
  const releaseSecond = deferred()
  const first = createRenderer("first", events)
  first.render = async () => {
    firstStarted.resolve()
    await releaseFirst.promise
  }
  const second = createRenderer("second", events)
  second.prepareToRender = async () => {
    events.push("second:prepare")
    secondStarted.resolve()
    await releaseSecond.promise
  }
  const third = createRenderer("third", events)
  const firstRender = view.render(first)
  const previous = view.renderPromise
  await firstStarted.promise

  const completions = [previous]
  const queued = [second, third].map(async (renderer) => {
    await previous
    const render = view.render(renderer)
    completions.push(view.renderPromise)
    return render
  })
  const renders = Promise.allSettled([firstRender, ...queued])

  try {
    releaseFirst.resolve()
    await secondStarted.promise
    assert.strictEqual(view.renderer, second)
    assert.notInclude(events, "third:prepare")
    assert.notStrictEqual(view.renderPromise, completions[1])

    releaseSecond.resolve()
    assert.deepEqual((await renders).map(({ status }) => status), ["fulfilled", "fulfilled", "fulfilled"])
    await Promise.all(completions)
    assert.deepEqual(events.filter((event) => /:(prepare|finish)$/.test(event)), [
      "first:prepare", "first:finish", "second:prepare", "second:finish", "third:prepare", "third:finish"
    ])
    assert.isUndefined(view.renderer)
    assert.isUndefined(view.renderPromise)
  } finally {
    releaseFirst.resolve()
    releaseSecond.resolve()
    await renders
  }
})

test("each paused render keeps its custom renderer, resume function, and render method", async () => {
  const firstIntercepted = deferred()
  const secondIntercepted = deferred()
  const resumes = new Map()
  const rendered = []
  const customized = []
  const view = createView({
    allowsImmediateRender(snapshot, { resume }) {
      assert.strictEqual(view.renderer.newSnapshot, snapshot)
      view.renderer.renderElement = () => customized.push(snapshot.name)
      resumes.set(snapshot.name, resume)
      if (snapshot.name === "first") firstIntercepted.resolve()
      else secondIntercepted.resolve()
      return false
    },
    viewRenderedSnapshot(snapshot, _isPreview, method) {
      rendered.push([snapshot.name, method])
    }
  })
  const first = createRenderer("first")
  first.renderMethod = "morph"
  const second = createRenderer("second")
  second.renderMethod = "replace"
  const firstRender = view.render(first)
  const firstCompletion = view.renderPromise
  await firstIntercepted.promise
  const secondRender = view.render(second)
  const secondCompletion = view.renderPromise
  const renders = Promise.allSettled([firstRender, secondRender])

  try {
    resumes.get("first")()
    await secondIntercepted.promise
    await firstRender
    assert.strictEqual(view.renderer, second)
    assert.strictEqual(view.renderPromise, secondCompletion)
    assert.deepEqual(customized, ["first"])

    resumes.get("first")()
    assert.deepEqual(customized, ["first"])
    resumes.get("second")()
    assert.deepEqual((await renders).map(({ status }) => status), ["fulfilled", "fulfilled"])
    await Promise.all([firstCompletion, secondCompletion])
    assert.deepEqual(customized, ["first", "second"])
    assert.deepEqual(rendered, [["first", "morph"], ["second", "replace"]])
    assert.isUndefined(view.renderer)
    assert.isUndefined(view.renderPromise)
  } finally {
    for (const resume of resumes.values()) resume()
    await renders
  }
})

for (const phase of ["prepareToRender", "render"]) {
  test(`a ${phase} failure reaches its caller and releases the next render`, async () => {
    const view = createView()
    const started = deferred()
    const failure = deferred()
    const error = new Error(`Failed ${phase}`)
    const first = createRenderer("first")
    first[phase] = async () => {
      started.resolve()
      await failure.promise
    }
    const second = createRenderer("second")
    const firstRender = view.render(first)
    const firstCompletion = view.renderPromise
    await started.promise
    const secondRender = view.render(second)
    const secondCompletion = view.renderPromise
    const renders = Promise.allSettled([firstRender, secondRender])

    try {
      assert.strictEqual(view.renderer, first)
      failure.reject(error)
      assert.deepEqual(await renders, [
        { status: "rejected", reason: error }, { status: "fulfilled", value: undefined }
      ])
      await Promise.all([firstCompletion, secondCompletion])
      assert.isUndefined(view.renderer)
      assert.isUndefined(view.renderPromise)
    } finally {
      failure.reject(error)
      await renders
    }
  })
}

test("a renderer that should not render preserves immediate invalidation and the active render", async () => {
  const invalidations = []
  const view = createView({ viewInvalidated: (reason) => invalidations.push(reason) })
  const started = deferred()
  const release = deferred()
  const active = createRenderer("active")
  active.render = async () => {
    started.resolve()
    await release.promise
  }
  const render = view.render(active)
  const completion = view.renderPromise
  await started.promise

  try {
    const invalid = createRenderer("invalid")
    invalid.shouldRender = false
    invalid.reloadReason = { reason: "tracked_element_mismatch" }
    await view.render(invalid)
    const ignored = createRenderer("ignored")
    ignored.shouldRender = false
    ignored.willRender = false
    await view.render(ignored)

    assert.deepEqual(invalidations, [invalid.reloadReason])
    assert.strictEqual(view.renderer, active)
    assert.strictEqual(view.renderPromise, completion)
  } finally {
    release.resolve()
    await render
  }
})

function createView(delegate = {}) {
  return new View({
    allowsImmediateRender: () => true,
    viewRenderedSnapshot: () => {},
    preloadOnLoadLinksForView: () => {},
    viewInvalidated: () => {},
    ...delegate
  }, document.createElement("div"))
}

function createRenderer(name, events = []) {
  return {
    isPreview: false,
    shouldRender: true,
    willRender: true,
    newSnapshot: { name },
    renderMethod: "replace",
    prepareToRender() { events.push(`${name}:prepare`) },
    renderElement() {},
    async render() { await this.renderElement() },
    finishRendering() { events.push(`${name}:finish`) }
  }
}

function deferred() {
  let resolve, reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
