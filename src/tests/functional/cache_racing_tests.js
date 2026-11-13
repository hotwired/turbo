import { expect, test } from "@playwright/test"

const sourcePath = "/src/tests/fixtures/cache_racing.html"
const targetPath = "/src/tests/fixtures/cache_racing_target.html"
const stylesheetPath = "/src/tests/fixtures/test.css?cache-racing"
const pageStates = new WeakMap()
const originalState = { heading: "Original client state", input: "Changed input", marker: "original" }

test.beforeEach(async ({ page }) => {
  const state = { sourceRequests: 0, errors: [] }
  pageStates.set(page, state)
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname + url.search === sourcePath) state.sourceRequests++
  })
  page.on("pageerror", (error) => state.errors.push(error.message))
  await page.goto(sourcePath)
  await expect(page.locator("#component-output")).toHaveCount(1)
  await page.evaluate(() => {
    window.cacheRaceDocument = document
    window.cacheRaceBody = document.body
    window.cacheRaceLoads = []
    window.cacheRaceNotifications = 0
    addEventListener("turbo:load", ({ detail }) => window.cacheRaceLoads.push(detail.url))
    addEventListener("turbo:before-cache", () => window.cacheRaceNotifications++)
    document.querySelector("h1").textContent = "Original client state"
    document.getElementById("client-state").value = "Changed input"
    document.body.setAttribute("data-client-state", "original")
  })
})

test.afterEach(async ({ page }) => {
  expect(pageStates.get(page).errors).toEqual([])
})

test("a delayed body replacement caches the detached component's cleanup", async ({ page }) => {
  const stylesheet = await holdStylesheet(page)
  try {
    await page.locator("#link-to-page-with-different-head").evaluate((link) => link.click())
    await stylesheet.arrived
    await expect.poll(() => cachedState(page)).toEqual(originalState)
    await expect(page.locator("#component-output")).toHaveCount(1)
    expect(await page.evaluate(() => document.body === window.cacheRaceBody)).toEqual(true)
    expect(await page.evaluate(() => window.cacheRaceNotifications)).toEqual(1)

    stylesheet.release()
    await waitForLoad(page, targetPath)
    await expect.poll(() => cachedWidgetCount(page)).toEqual(0)
    expect(await page.evaluate(() => window.cacheRaceNotifications)).toEqual(1)
    expect(await page.evaluate(() => document.body === window.cacheRaceBody)).toEqual(false)

    await page.goBack()
    await expectOriginalPage(page)
    await expect(page.locator("#component-output")).toHaveCount(1)
  } finally {
    stylesheet.release()
    await stylesheet.finished
  }
})

for (const paused of [true, false]) {
  test(`a ${paused ? "paused" : "normal"} morph caches the original page before changing it in place`, async ({ page }) => {
    await prepareInPlaceVisit(page, "morph", paused)
    await page.evaluate((path) => window.Turbo.visit(path, { action: "replace" }), `${sourcePath}?state=new`)

    if (paused) {
      await page.waitForFunction(() => window.resumeCacheRaceRender)
      await expect.poll(() => cachedState(page)).toEqual(originalState)
      await page.evaluate(() => window.resumeCacheRaceRender())
    }

    await waitForLoad(page, `${sourcePath}?state=new`)
    await expect(page.locator("h1")).toHaveText("New page")
    expect(await page.evaluate(() => window.cacheRaceRenderMethod)).toEqual("morph")
    expect(await page.evaluate(() => document.body === window.cacheRaceBody)).toEqual(true)
    expect(await page.evaluate(() => window.cacheRaceNotifications)).toEqual(1)
    await expect.poll(() => cachedState(page)).toEqual(originalState)

    await page.goBack()
    await expectOriginalPage(page)
  })
}

test("a custom replace render that retains the body caches the original page", async ({ page }) => {
  await prepareInPlaceVisit(page, "custom", false)
  await page.evaluate((path) => window.Turbo.visit(path, { action: "replace" }), `${sourcePath}?state=new`)
  await waitForLoad(page, `${sourcePath}?state=new`)

  await expect(page.locator("h1")).toHaveText("New page")
  expect(await page.evaluate(() => window.cacheRaceRenderMethod)).toEqual("replace")
  expect(await page.evaluate(() => document.body === window.cacheRaceBody)).toEqual(true)
  expect(await page.evaluate(() => window.cacheRaceNotifications)).toEqual(1)
  await expect.poll(() => cachedState(page)).toEqual(originalState)

  await page.goBack()
  await expectOriginalPage(page)
})

async function prepareInPlaceVisit(page, method, paused) {
  await page.locator("#component-container").evaluate((container) => container.remove())
  await page.route(`**${sourcePath}?state=new`, async (route) => {
    const response = await route.fetch()
    const html = (await response.text())
      .replace("<h1>Original page</h1>", "<h1>New page</h1>")
      .replace('value="Server value"', 'value="New value"')
      .replace('<div id="component-container"></div>', "")
      .replace('<body id="cache-racing-source">', '<body id="cache-racing-source" data-client-state="new">')
    await route.fulfill({ response, body: html })
  })
  await page.evaluate(({ method, paused }) => {
    if (method === "morph") {
      const meta = document.createElement("meta")
      meta.name = "turbo-refresh-method"
      meta.content = "morph"
      document.head.append(meta)
    }

    addEventListener("turbo:before-render", (event) => {
      window.cacheRaceRenderMethod = event.detail.renderMethod
      if (method === "custom") {
        event.detail.render = (currentBody, newBody) => {
          currentBody.replaceChildren(...newBody.childNodes)
          currentBody.setAttribute("data-client-state", "new")
        }
      }
      if (paused) {
        event.preventDefault()
        window.resumeCacheRaceRender = event.detail.resume
      }
    }, { once: true })

    // Keep an earlier entry at the origin so Back can restore the snapshot replaced below.
    history.pushState(history.state, "", location.href)
  }, { method, paused })
}

async function holdStylesheet(page) {
  let release
  let arrived
  let finished
  const released = new Promise((resolve) => release = resolve)
  const arrival = new Promise((resolve) => arrived = resolve)
  const completion = new Promise((resolve) => finished = resolve)
  await page.route(`**${stylesheetPath}`, async (route) => {
    arrived()
    try {
      await released
      await route.fulfill({ contentType: "text/css", body: "" })
    } finally {
      finished()
    }
  })
  return { arrived: arrival, release, finished: completion }
}

function cachedState(page) {
  return page.evaluate((path) => {
    const body = window.Turbo.session.view.snapshotCache.get(new URL(path, location.href))?.element
    if (body) {
      return {
        heading: body.querySelector("h1").textContent,
        input: body.querySelector("#client-state").value,
        marker: body.getAttribute("data-client-state")
      }
    }
  }, sourcePath)
}

function cachedWidgetCount(page) {
  return page.evaluate((path) => {
    return window.Turbo.session.view.snapshotCache.get(new URL(path, location.href))?.element.querySelectorAll("#component-output").length
  }, sourcePath)
}

function waitForLoad(page, path) {
  return page.waitForFunction((path) => window.cacheRaceLoads.at(-1) === new URL(path, location.href).href, path)
}

async function expectOriginalPage(page) {
  await waitForLoad(page, sourcePath)
  await expect(page).toHaveURL(new URL(sourcePath, page.url()).href)
  await expect(page.locator("h1")).toHaveText(originalState.heading)
  await expect(page.locator("#client-state")).toHaveValue(originalState.input)
  await expect(page.locator("body")).toHaveAttribute("data-client-state", originalState.marker)
  expect(await page.evaluate(() => document === window.cacheRaceDocument)).toEqual(true)
  expect(pageStates.get(page).sourceRequests).toEqual(1)
}
