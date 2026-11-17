import { expect, test } from "@playwright/test"

for (const mode of ["classic", "deferred"]) {
  test(`${mode} Turbo notifies before the initial image finishes loading`, async ({ page }) => {
    const image = await holdImage(page)

    try {
      await page.goto(`/src/tests/fixtures/page_observer/${mode}.html`, { waitUntil: "domcontentloaded" })
      await image.started

      const state = await readPageState(page)
      const eventNames = mode === "classic" ? ["turbo:load", "DOMContentLoaded"] : ["DOMContentLoaded", "turbo:load"]
      expect(state.readyState).toEqual("interactive")
      expect(state.imageComplete).toEqual(false)
      expect(state.observerStarted).toEqual(true)
      expect(state.applicationReadyState).toEqual(mode === "classic" ? "loading" : "interactive")
      expect(state.applicationLoadCount).toEqual(1)
      expect(state.events).toEqual(eventNames.map(name => ({ name, readyState: "interactive", applicationReady: true })))

      image.release()
      await page.waitForLoadState("load")

      const loaded = await readPageState(page)
      expect(loaded.readyState).toEqual("complete")
      expect(loaded.imageComplete).toEqual(true)
      expect(loaded.applicationLoadCount).toEqual(1)
      expect(loaded.events.map(event => event.name)).toEqual([...eventNames, "load"])
    } finally {
      image.release()
      await image.finished()
    }
  })
}

for (const restart of [false, true]) {
  test(`${restart ? "restarting" : "stopping"} a deferred observer before DOMContentLoaded ${restart ? "notifies once" : "prevents notification"}`, async ({ page }) => {
    const image = await holdImage(page)
    const lifecycle = ["window.Turbo.session.pageObserver.stop()"]
    if (restart) lifecycle.push("window.Turbo.session.pageObserver.start()")
    await appendApplicationScript(page, lifecycle.join("\n"))

    try {
      await page.goto("/src/tests/fixtures/page_observer/deferred.html", { waitUntil: "domcontentloaded" })
      await image.started

      const state = await readPageState(page)
      const expectedLoads = restart ? 1 : 0
      expect(state.readyState).toEqual("interactive")
      expect(state.imageComplete).toEqual(false)
      expect(state.applicationReadyState).toEqual("interactive")
      expect(state.observerStarted).toEqual(restart)
      expect(state.applicationLoadCount).toEqual(expectedLoads)
      expect(state.events.filter(event => event.name === "turbo:load")).toHaveLength(expectedLoads)

      image.release()
      await page.waitForLoadState("load")

      const loaded = await readPageState(page)
      expect(loaded.readyState).toEqual("complete")
      expect(loaded.imageComplete).toEqual(true)
      expect(loaded.applicationLoadCount).toEqual(expectedLoads)
      expect(loaded.events.filter(event => event.name === "turbo:load")).toHaveLength(expectedLoads)
    } finally {
      image.release()
      await image.finished()
    }
  })
}

test("restarting after DOMContentLoaded does not notify again when the page completes", async ({ page }) => {
  const image = await holdImage(page)

  try {
    await page.goto("/src/tests/fixtures/page_observer/deferred.html", { waitUntil: "domcontentloaded" })
    await image.started
    expect((await readPageState(page)).applicationLoadCount).toEqual(1)

    await page.evaluate(() => {
      window.Turbo.session.pageObserver.stop()
      window.Turbo.session.pageObserver.start()
    })
    image.release()
    await page.waitForLoadState("load")

    const loaded = await readPageState(page)
    expect(loaded.readyState).toEqual("complete")
    expect(loaded.observerStarted).toEqual(true)
    expect(loaded.applicationLoadCount).toEqual(1)
    expect(loaded.events.filter(event => event.name === "turbo:load")).toHaveLength(1)
  } finally {
    image.release()
    await image.finished()
  }
})

test("loading Turbo after the document completes does not replay the initial notification", async ({ page }) => {
  await page.goto("/src/tests/fixtures/bare.html")
  await page.evaluate(() => {
    window.lateLoadCount = 0
    document.addEventListener("turbo:load", () => window.lateLoadCount++)
  })

  await page.addScriptTag({ url: "/dist/turbo.es2017-umd.js" })

  expect(await page.evaluate(() => document.readyState)).toEqual("complete")
  expect(await page.evaluate(() => window.Turbo.session.pageObserver.started)).toEqual(true)
  expect(await page.evaluate(() => window.lateLoadCount)).toEqual(0)
})

async function holdImage(page) {
  let release, markStarted
  const released = new Promise(resolve => release = resolve)
  const started = new Promise(resolve => markStarted = resolve)
  const responses = []
  await page.route("**/src/tests/fixtures/svg.svg", route => {
    const request = route.request()
    const response = (async () => {
      await released
      await route.continue()
      const result = await request.response()
      if (result) await result.finished()
    })()
    responses.push(response)
    markStarted()
    return response
  })

  return { release, started, finished: () => Promise.all(responses) }
}

async function readPageState(page) {
  return page.evaluate(() => ({
    readyState: document.readyState,
    imageComplete: document.getElementById("held-image").complete,
    observerStarted: window.Turbo.session.pageObserver.started,
    applicationReadyState: window.applicationReadyState,
    applicationLoadCount: window.applicationLoadCount,
    events: window.pageObserverEvents
  }))
}

async function appendApplicationScript(page, script) {
  await page.route("**/src/tests/fixtures/page_observer/application.js", async route => {
    const response = await route.fetch()
    await route.fulfill({ response, body: `${await response.text()}\n${script}\n` })
  })
}
