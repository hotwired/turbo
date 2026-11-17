import { expect, test } from "@playwright/test"

const initialPath = "/src/tests/fixtures/frame_morph_reload/initial.html"
const nextPath = "/src/tests/fixtures/frame_morph_reload/next.html"
const heldReloads = new WeakMap()

test.beforeEach(async ({ page }) => {
  heldReloads.set(page, [])
  await page.goto("/src/tests/fixtures/frame_morph_reload/index.html")
  await waitForFrameLoad(page, 1)
})

test.afterEach(async ({ page }) => {
  const reloads = heldReloads.get(page)
  if (reloads.length && !page.isClosed()) {
    await page.locator("#frame").evaluate(frame => frame.src = null)
  }
  for (const reload of reloads) reload.release()
  await Promise.all(reloads.map(reload => reload.finished))
})

test("a navigation during a morph reload replaces the frame contents", async ({ page }) => {
  const reload = await holdReload(page)
  await page.evaluate(() => { document.getElementById("frame").reload() })
  await reload.started

  await page.click("#navigate-frame")
  await waitForFrameLoad(page, 2)

  await expect(page.locator("#frame h2")).toHaveText("Next frame")
  expect(await page.locator("#permanent-input").count()).toEqual(0)
  expect(await page.evaluate(() => window.frameMorphs)).toEqual(0)
})

test("a reentrant navigation does not inherit the reload's morph mode", async ({ page }) => {
  await page.evaluate(nextPath => {
    const frame = document.getElementById("frame")
    const navigate = event => {
      if (event.target === frame) {
        document.removeEventListener("turbo:before-fetch-request", navigate)
        window.reentrantNavigationStarted = true
        frame.src = nextPath
      }
    }
    document.addEventListener("turbo:before-fetch-request", navigate)
    frame.reload()
  }, nextPath)
  await waitForFrameLoad(page, 2)

  expect(await page.evaluate(() => window.reentrantNavigationStarted)).toEqual(true)
  await expect(page.locator("#frame h2")).toHaveText("Next frame")
  expect(await page.locator("#permanent-input").count()).toEqual(0)
  expect(await page.evaluate(() => window.frameMorphs)).toEqual(0)
})

test("an ordinary morph reload preserves the heading, input value and focus", async ({ page }) => {
  const input = page.locator("#permanent-input")
  await input.fill("Preserve me")
  await input.focus()
  await page.evaluate(() => {
    window.previousFrameHeading = document.getElementById("frame-title")
    document.getElementById("frame").reload()
  })
  await waitForFrameLoad(page, 2)

  await expect(page.locator("#frame h2")).toHaveText("Initial frame")
  expect(await page.evaluate(() => document.getElementById("frame-title") === window.previousFrameHeading)).toEqual(true)
  expect(await page.evaluate(() => window.frameMorphs)).toEqual(1)
  await expect(input).toHaveValue("Preserve me")
  await expect(input).toBeFocused()
})

test("a GET form response during a morph reload replaces the frame contents", async ({ page }) => {
  const reload = await holdReload(page)
  await page.evaluate(() => { document.getElementById("frame").reload() })
  await reload.started

  await page.click("#navigate-form button")
  await waitForFrameLoad(page, 2)

  await expect(page.locator("#frame h2")).toHaveText("Next frame")
  expect(await page.locator("#permanent-input").count()).toEqual(0)
  expect(await page.evaluate(() => window.frameMorphs)).toEqual(0)
})

test("a failed form response during a morph reload replaces the frame contents", async ({ page }) => {
  await page.route("**/frame_morph_reload/rejected.html", route => route.fulfill({
    status: 422,
    contentType: "text/html",
    body: '<turbo-frame id="frame"><h2 id="frame-title">Rejected frame</h2></turbo-frame>'
  }))
  const reload = await holdReload(page)
  await page.evaluate(() => { document.getElementById("frame").reload() })
  await reload.started

  await page.click("#rejected-form button")
  await waitForFrameLoad(page, 2)

  await expect(page.locator("#frame h2")).toHaveText("Rejected frame")
  expect(await page.locator("#permanent-input").count()).toEqual(0)
  expect(await page.evaluate(() => window.frameMorphs)).toEqual(0)
})

test("reloading a disabled frame does not affect a later navigation's render mode", async ({ page }) => {
  await page.evaluate(nextPath => {
    const frame = document.getElementById("frame")
    frame.disabled = true
    frame.reload()
    window.requestsBeforeActivation = window.frameRequests.length
    frame.src = nextPath
    frame.disabled = false
  }, nextPath)
  await waitForFrameLoad(page, 2)

  expect(await page.evaluate(() => window.requestsBeforeActivation)).toEqual(1)
  await expect(page.locator("#frame h2")).toHaveText("Next frame")
  expect(await page.locator("#permanent-input").count()).toEqual(0)
  expect(await page.evaluate(() => window.frameMorphs)).toEqual(0)
})

test("reloading a disconnected frame does not affect a later navigation's render mode", async ({ page }) => {
  await page.evaluate(nextPath => {
    const frame = document.getElementById("frame")
    frame.remove()
    frame.reload()
    window.requestsBeforeActivation = window.frameRequests.length
    frame.src = nextPath
    document.body.append(frame)
  }, nextPath)
  await waitForFrameLoad(page, 2)

  expect(await page.evaluate(() => window.requestsBeforeActivation)).toEqual(1)
  await expect(page.locator("#frame h2")).toHaveText("Next frame")
  expect(await page.locator("#permanent-input").count()).toEqual(0)
  expect(await page.evaluate(() => window.frameMorphs)).toEqual(0)
})

test("reloading an unloaded lazy frame does not affect its first navigation's render mode", async ({ page }) => {
  await page.evaluate(({ initialPath, nextPath }) => {
    const previousFrame = document.getElementById("frame")
    const frame = document.createElement("turbo-frame")
    frame.id = "frame"
    frame.loading = "lazy"
    frame.refresh = "morph"
    frame.src = initialPath
    frame.style.marginTop = "10000px"
    frame.innerHTML = '<h2>Waiting</h2><input id="permanent-input" data-turbo-permanent>'
    previousFrame.replaceWith(frame)
    frame.reload()
    window.requestsBeforeActivation = window.frameRequests.length
    frame.src = nextPath
    frame.loading = "eager"
  }, { initialPath, nextPath })
  await waitForFrameLoad(page, 2)

  expect(await page.evaluate(() => window.requestsBeforeActivation)).toEqual(1)
  await expect(page.locator("#frame h2")).toHaveText("Next frame")
  expect(await page.locator("#permanent-input").count()).toEqual(0)
  expect(await page.evaluate(() => window.frameMorphs)).toEqual(0)
})

async function holdReload(page) {
  let start, release
  const started = new Promise(resolve => start = resolve)
  const released = new Promise(resolve => release = resolve)
  const reload = { started, release }
  heldReloads.get(page).push(reload)
  await page.route(`**${initialPath}`, route => {
    reload.finished = (async () => {
      await released
      if (!route.request().failure()) await route.continue()
    })()
    start()
    return reload.finished
  })
  return reload
}

async function waitForFrameLoad(page, count) {
  await page.waitForFunction(count => window.frameLoads === count, count)
}
