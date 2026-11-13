import { expect, test } from "@playwright/test"

const sourcePath = "/src/tests/fixtures/frames.html"
const framePath = "/src/tests/fixtures/frames/frame.html"
const nextPath = "/src/tests/fixtures/one.html"
const rightPath = "/src/tests/fixtures/stylesheets/right.html"
const heldRequests = new WeakMap()

test.beforeEach(async ({ page }) => {
  heldRequests.set(page, [])
  await page.goto(sourcePath)
  await page.evaluate(() => {
    document.querySelector("h1").textContent = "Original client state"
    window.promotedFrameLoads = 0
    window.pageLoads = []
    addEventListener("turbo:load", ({ detail }) => window.pageLoads.push(detail.url))
    document.getElementById("frame").addEventListener("turbo:frame-load", () => window.promotedFrameLoads++)
  })
})

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) await page.evaluate(() => window.restoreFrameExtraction?.())

  const requests = heldRequests.get(page)
  for (const request of requests) request.release()
  await Promise.all(requests.map((request) => request.finished))
})

test("a promoted frame preserves both history snapshots while a Drive response is pending", async ({ page }) => {
  const frame = await holdRequest(page, `**${framePath}`)
  const next = await holdRequest(page, `**${nextPath}`)
  await addTemporaryElements(page)

  await startFrameAndPageVisits(page, frame, next)
  frame.release()
  await waitForFrameLoad(page)

  await expect(page).toHaveURL(framePath)
  expect(await currentVisit(page)).toMatchObject({ pathname: nextPath, state: "started", historyChanged: false })
  await expect(page.locator("#old-temporary")).toHaveCount(0)
  await expect(page.locator("#new-temporary")).toHaveCount(1)

  next.release()
  await expect(page.locator("h1")).toHaveText("One")
  await expect(page).toHaveURL(nextPath)

  await page.goBack()
  await expectOriginalPage(page, framePath, "Frame: Loaded")
  await expectNoTemporaryElements(page)

  await page.goBack()
  await expectOriginalPage(page, sourcePath, "Frames: #frame")
  await expectNoTemporaryElements(page)

  await page.goForward()
  await expectOriginalPage(page, framePath, "Frame: Loaded")
  await page.goForward()
  await expect(page.locator("h1")).toHaveText("One")
  await expect(page).toHaveURL(nextPath)
})

test("a late promoted frame preserves Drive history already committed while a stylesheet is pending", async ({ page }) => {
  const frame = await holdRequest(page, `**${framePath}`)
  const stylesheet = await holdRequest(page, "**/src/tests/fixtures/stylesheets/right.css")
  await startFrameAndPageVisits(page, frame, stylesheet, rightPath)

  await expect(page).toHaveURL(rightPath)
  expect(await currentVisit(page)).toMatchObject({ pathname: rightPath, historyChanged: true, snapshotCached: true })
  frame.release()
  await waitForFrameLoad(page)

  await expect(page).toHaveURL(rightPath)
  expect(await currentVisit(page)).toMatchObject({ pathname: rightPath, state: "started" })
  stylesheet.release()
  await expect(page.locator("h1")).toHaveText("Right")
  await expect(page).toHaveURL(rightPath)

  await page.goBack()
  await expectOriginalPage(page, sourcePath, "Frames: #frame")
  await page.goForward()
  await expect(page.locator("h1")).toHaveText("Right")
  await expect(page).toHaveURL(rightPath)
})

test("a promoted frame respects a Drive visit that disables snapshot caching", async ({ page }) => {
  const frame = await holdRequest(page, `**${framePath}`)
  const next = await holdRequest(page, `**${nextPath}`)
  await page.click("#link-outside-frame-action-advance")
  await frame.arrived
  await page.evaluate((path) => window.Turbo.visit(path, { shouldCacheSnapshot: false }), nextPath)
  await next.arrived

  frame.release()
  await waitForFrameLoad(page)
  expect(await page.evaluate(() => Object.keys(window.Turbo.session.view.snapshotCache.snapshots))).toEqual([])
  expect(await currentVisit(page)).toMatchObject({ pathname: nextPath, state: "started" })

  next.release()
  await expect(page.locator("h1")).toHaveText("One")
  await expect(page).toHaveURL(nextPath)
  expect(await page.evaluate(() => Object.keys(window.Turbo.session.view.snapshotCache.snapshots))).toEqual([])
})

test("a promotion without a competing Drive visit keeps normal events and temporary snapshot cleanup", async ({ page }) => {
  await addTemporaryElements(page)
  await page.evaluate(() => {
    window.beforeCacheCount = 0
    window.promotedLoads = 0
    addEventListener("turbo:before-cache", () => window.beforeCacheCount++)
    addEventListener("turbo:load", () => window.promotedLoads++)
  })

  await page.click("#link-outside-frame-action-advance")
  await page.waitForFunction(() => window.promotedLoads === 1)
  await expectOriginalPage(page, framePath, "Frame: Loaded")
  await expect(page.locator("#new-temporary")).toHaveCount(1)
  expect(await page.evaluate(() => window.beforeCacheCount)).toEqual(0)

  await page.goBack()
  await expectOriginalPage(page, sourcePath, "Frames: #frame")
  await expectNoTemporaryElements(page)
})

test("a reentrant frame navigation keeps its own promotion after the previous frame-load", async ({ page }) => {
  const secondPath = `${framePath}?navigation=second`
  const second = await holdRequest(page, `**${secondPath}`)
  await page.evaluate((path) => {
    document.getElementById("frame").addEventListener("turbo:frame-load", () => {
      document.getElementById("link-outside-frame-action-advance").href = path
      document.getElementById("link-outside-frame-action-advance").click()
    }, { once: true })
  }, secondPath)

  await page.click("#link-outside-frame-action-advance")
  await second.arrived
  await expect(page).toHaveURL(framePath)
  await expect(page.locator("#frame")).toHaveAttribute("busy", "")
  second.release()
  await waitForFrameLoad(page, 2)
  await expect(page).toHaveURL(secondPath)
  await waitForPageLoad(page, secondPath)
  await expect(page.locator("#frame")).not.toHaveAttribute("busy")

  await page.goBack()
  await expectOriginalPage(page, framePath, "Frame: Loaded")
  await page.goBack()
  await expectOriginalPage(page, sourcePath, "Frames: #frame")
})

test("a promoted frame waiting for an earlier render cannot change a completed Drive visit", async ({ page }) => {
  const previousPath = `${framePath}?render=previous`
  await pauseNextFrameRender(page)
  await observeSecondFrameExtraction(page)
  await page.evaluate((path) => window.pausedFrame.src = path, previousPath)
  await page.waitForFunction(() => window.frameRenderPaused)

  await page.click("#link-outside-frame-action-advance")
  // Observe extraction so the promoted response is already waiting for the
  // paused previous render before Drive replaces the original body.
  await page.waitForFunction(() => window.secondFrameExtracted)
  await completePageVisit(page)

  await resumeFrameRender(page, 2)

  await expect(page).toHaveURL(nextPath)
  await expect(page.locator("h1")).toHaveText("One")
  expect(await page.evaluate(() => document.body.contains(window.pausedFrame))).toEqual(false)
  expect(await page.evaluate(() => window.pausedFrame.querySelector("h2").textContent)).toEqual("Frame: Loaded")
  expect(await cachedFrameText(page, framePath)).toEqual(null)
})

test("a promoted permanent frame caches its rendered content after Drive moves it to another body", async ({ page }) => {
  const destination = "/src/tests/fixtures/frames/permanent_drive.html"
  await page.locator("#frame").evaluate((frame) => frame.setAttribute("data-turbo-permanent", ""))
  await pauseNextFrameRender(page)

  await page.click("#link-outside-frame-action-advance")
  await page.waitForFunction(() => window.frameRenderPaused)
  await expect(page).toHaveURL(framePath)
  await completePageVisit(page, destination)
  expect(await page.evaluate(() => document.body.contains(window.pausedFrame))).toEqual(true)

  await resumeFrameRender(page)

  await expect(page).toHaveURL(destination)
  await expect(page.locator("h1")).toHaveText("One")
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  expect(await cachedFrameText(page, framePath)).toEqual("Frame: Loaded")
  expect(await cachedFrameText(page, sourcePath)).toEqual("Frames: #frame")

  await page.locator("#frame").evaluate((frame) => frame.removeAttribute("data-turbo-permanent"))
  await page.goBack()
  await expectOriginalPage(page, framePath, "Frame: Loaded")
  await page.locator("#frame").evaluate((frame) => frame.removeAttribute("data-turbo-permanent"))
  await page.goBack()
  await expectOriginalPage(page, sourcePath, "Frames: #frame")
})

test("a POST response can render its detached frame without promoting the replacement page", async ({ page }) => {
  const post = await holdRequest(page, "**/__turbo/redirect")
  await prepareDetachedPostProbe(page)
  await page.locator("#form-post-frame-action-advance").evaluate((form) => form.requestSubmit())
  await post.arrived

  await page.evaluate((path) => window.Turbo.visit(path), nextPath)
  await waitForPageLoad(page, nextPath)
  await expect(page).toHaveURL(nextPath)
  await expect(page.locator("h1")).toHaveText("One")
  expect(await page.evaluate(() => window.detachedPostFrame.isConnected)).toEqual(false)
  await page.evaluate(() => {
    window.detachedPostReplacementBody = document.body
    window.detachedPostVisits = []
    window.pageLoads = []
    addEventListener("turbo:visit", ({ detail: { url } }) => window.detachedPostVisits.push(url))
  })

  post.release()
  await page.waitForFunction(() => window.detachedPostRendered && window.detachedPostEnded)

  expect(await page.evaluate(() => ({
    error: window.detachedPostError,
    success: window.detachedPostResult.success,
    aborted: window.detachedPostResult.formSubmission.fetchRequest.abortSignal.aborted,
    state: window.detachedPostResult.formSubmission.state,
    frameText: window.detachedPostFrame.querySelector("h2").textContent,
    replacementBodyUnchanged: document.body === window.detachedPostReplacementBody,
    visits: window.detachedPostVisits,
    loads: window.pageLoads
  }))).toEqual({
    error: null,
    success: true,
    aborted: false,
    state: "stopped",
    frameText: "Frame: Loaded",
    replacementBodyUnchanged: true,
    visits: [],
    loads: []
  })
  await expect(page).toHaveURL(nextPath)
  await expect(page.locator("h1")).toHaveText("One")
  await expect(page.locator("#frame")).toHaveCount(0)
})

async function holdRequest(page, url) {
  let arrive, release
  const arrived = new Promise((resolve) => arrive = resolve)
  const released = new Promise((resolve) => release = resolve)
  const gate = { arrived, release }
  heldRequests.get(page).push(gate)
  await page.route(url, async (route) => {
    gate.finished = (async () => {
      await released
      if (!route.request().failure()) await route.continue()
    })()
    arrive()
    await gate.finished
  })
  return gate
}

async function startFrameAndPageVisits(page, frame, next, path = nextPath) {
  await page.click("#link-outside-frame-action-advance")
  await frame.arrived
  await page.locator("#outside-navigate-top-link").evaluate((link, path) => link.href = path, path)
  await page.click("#outside-navigate-top-link")
  await next.arrived
}

async function waitForFrameLoad(page, count = 1) {
  await page.waitForFunction((count) => window.promotedFrameLoads === count, count)
}

async function currentVisit(page) {
  return page.evaluate(() => {
    const visit = window.Turbo.session.navigator.currentVisit
    return visit && {
      pathname: visit.location.pathname,
      state: visit.state,
      historyChanged: visit.historyChanged,
      snapshotCached: visit.snapshotCached
    }
  })
}

async function expectOriginalPage(page, path, frameText) {
  await waitForPageLoad(page, path)
  await expect(page).toHaveURL(path)
  await expect(page.locator("h1")).toHaveText("Original client state")
  await expect(page.locator("#frame h2")).toHaveText(frameText)
}

async function waitForPageLoad(page, path) {
  await page.waitForFunction((path) => window.pageLoads.at(-1) === new URL(path, location.href).href, path)
}

async function addTemporaryElements(page) {
  await page.evaluate(() => {
    const outside = document.createElement("div")
    outside.id = "outside-temporary"
    outside.setAttribute("data-turbo-temporary", "")
    document.body.append(outside)
    const old = outside.cloneNode()
    old.id = "old-temporary"
    document.getElementById("frame").append(old)
    document.getElementById("frame").addEventListener("turbo:before-frame-render", ({ detail: { newFrame } }) => {
      const temporary = outside.cloneNode()
      temporary.id = "new-temporary"
      newFrame.append(temporary)
    }, { once: true })
  })
}

async function expectNoTemporaryElements(page) {
  await expect(page.locator("[data-turbo-temporary]")).toHaveCount(0)
}

async function pauseNextFrameRender(page) {
  await page.evaluate(() => {
    const frame = window.pausedFrame = document.getElementById("frame")
    window.pausedFrameLoads = 0
    addEventListener("turbo:frame-load", ({ target }) => {
      if (target === frame || target === document.documentElement) window.pausedFrameLoads++
    })
    frame.addEventListener("turbo:before-frame-render", (event) => {
      event.preventDefault()
      window.frameRenderPaused = true
      window.resumeFrameRender = event.detail.resume
    }, { once: true })
  })
}

async function observeSecondFrameExtraction(page) {
  await page.evaluate(() => {
    const frame = document.getElementById("frame")
    let extracted = 0
    const extract = frame.delegate.extractForeignFrameElement
    window.restoreFrameExtraction = () => frame.delegate.extractForeignFrameElement = extract
    frame.delegate.extractForeignFrameElement = async function (...args) {
      const incomingFrame = await extract.apply(this, args)
      if (++extracted === 2) {
        window.secondFrameExtracted = true
        window.restoreFrameExtraction()
      }
      return incomingFrame
    }
  })
}

async function completePageVisit(page, path = nextPath) {
  await page.evaluate((path) => window.Turbo.visit(path), path)
  await waitForPageLoad(page, path)
  await expect(page.locator("h1")).toHaveText("One")
}

async function resumeFrameRender(page, count = 1) {
  await page.evaluate(() => window.resumeFrameRender())
  await page.waitForFunction((count) => window.pausedFrameLoads >= count &&
    window.pausedFrame.querySelector("h2")?.textContent === "Frame: Loaded", count)
}

async function cachedFrameText(page, path) {
  return page.evaluate((path) => {
    const snapshot = window.Turbo.session.view.getCachedSnapshotForLocation(new URL(path, location.href))
    return snapshot?.element.querySelector("#frame h2")?.textContent ?? null
  }, path)
}

async function prepareDetachedPostProbe(page) {
  await page.evaluate(() => {
    const frame = window.detachedPostFrame = document.getElementById("frame")
    const form = document.getElementById("form-post-frame-action-advance")
    window.detachedPostError = null
    addEventListener("turbo:submit-end", ({ detail }) => {
      if (detail.formSubmission.formElement === form) {
        window.detachedPostResult = detail
        window.detachedPostEnded = true
      }
    })

    const loadResponse = frame.delegate.loadResponse
    frame.delegate.loadResponse = async function (...args) {
      try {
        return await loadResponse.apply(this, args)
      } catch (error) {
        window.detachedPostError = error.message
        throw error
      } finally {
        frame.delegate.loadResponse = loadResponse
        window.detachedPostRendered = true
      }
    }
  })
}
