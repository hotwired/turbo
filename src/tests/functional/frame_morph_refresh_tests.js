import { expect, test } from "@playwright/test"

const fixturePath = "/src/tests/fixtures/frame_morph_refresh/index.html"
const heldRequests = new WeakMap()

test.beforeEach(async ({ page }) => {
  const requests = []
  heldRequests.set(page, requests)
  await page.route(`**${fixturePath}?frame=*`, route => {
    const id = new URL(route.request().url()).searchParams.get("frame")
    const ordinal = requests.filter(request => request.id === id).length + 1
    let release
    const released = new Promise(resolve => release = resolve)
    const request = { id, ordinal, release }
    requests.push(request)
    request.finished = (async () => {
      const response = await released
      if (!route.request().failure()) {
        await route.fulfill({
          contentType: "text/html",
          body: `<turbo-frame id="${id}"><h2 id="${id}-title">Version ${ordinal}</h2></turbo-frame>`,
          ...response
        })
      }
    })()
    return request.finished
  })
  await page.goto(fixturePath)
})

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) {
    await page.evaluate(() => {
      for (const frame of document.querySelectorAll("turbo-frame")) frame.src = null
      window.resumeFrameRender?.()
    })
  }
  const requests = heldRequests.get(page)
  for (const request of requests) request.release()
  await Promise.all(requests.map(request => request.finished))
})

for (const mode of ["eager", "lazy", "nested"]) {
  test(`coalesces repeated morphs until the ${mode} frame finishes rendering`, async ({ page }) => {
    await startFrame(page, { mode })
    await morphPage(page)
    await waitForRequest(page, 2)
    await morphPage(page)
    await morphPage(page)
    await expectRequestCount(page, 2)

    await saveFrameLoad(page)
    await pauseFrameRender(page, 2)
    await deliverRequest(page, 2)
    await page.waitForFunction(() => window.frameRenderPaused)
    await expectRequestCount(page, 2)

    await page.evaluate(() => window.resumeFrameRender())
    await waitForSavedLoad(page)
    await waitForRequest(page, 3)
    await finishRequest(page, 3)

    await expect(page.locator("#frame h2")).toHaveText("Version 3")
    await expectRequestCount(page, 3)
  })
}

test("a single morph does not schedule another refresh", async ({ page }) => {
  await startFrame(page)
  await morphPage(page)
  await finishRequest(page, 2)

  await expect(page.locator("#frame h2")).toHaveText("Version 2")
  await expectRequestCount(page, 2)
})

test("reading complete does not resolve or retire an active morph refresh", async ({ page }) => {
  await startFrame(page)
  await morphPage(page)
  await waitForRequest(page, 2)
  const complete = await page.evaluate(() => {
    const frame = document.getElementById("frame")
    window.activeLoadSettled = false
    frame.loaded.then(() => window.activeLoadSettled = true)
    return [frame.complete, frame.complete]
  })
  expect(complete).toEqual([false, false])

  await morphPage(page)
  await morphPage(page)
  await expectRequestCount(page, 2)
  expect(await page.evaluate(() => window.activeLoadSettled)).toEqual(false)

  await finishRequest(page, 2)
  await finishRequest(page, 3)
  await expectRequestCount(page, 3)
})

test("a stale ordinary response cannot retire the current morph refresh", async ({ page }) => {
  await startFrame(page)
  await saveFrameLoad(page, "initial")
  await pauseFrameRender(page, 1)
  await deliverRequest(page, 1)
  await page.waitForFunction(() => window.frameRenderPaused)

  await morphPage(page)
  await waitForRequest(page, 2)
  await page.evaluate(() => window.resumeFrameRender())
  await waitForSavedLoad(page, "initial")
  await morphPage(page)
  await expectRequestCount(page, 2)

  await finishRequest(page, 2)
  await finishRequest(page, 3)
  await expect(page.locator("#frame h2")).toHaveText("Version 3")
  await expectRequestCount(page, 3)
})

test("a missing-frame error still allows the queued refresh", async ({ page }) => {
  await startQueuedRefresh(page)
  const error = page.waitForEvent("pageerror")
  await finishRequest(page, 2, "frame", { body: "<p>Missing frame</p>" })
  expect((await error).message).toContain('did not contain the expected <turbo-frame id="frame">')

  await finishRequest(page, 3)
  await expect(page.locator("#frame h2")).toHaveText("Version 3")
  await expectRequestCount(page, 3)
})

for (const outcome of ["success", "rejected"]) {
  test(`a ${outcome} form response drops only the rendered frame's queued refresh`, async ({ page }) => {
    const renderedFrame = outcome === "success" ? "other-frame" : "frame"
    const queuedFrame = outcome === "success" ? "frame" : "other-frame"
    await page.route(`**${fixturePath}?form=${outcome}`, route => route.fulfill({
      status: outcome === "success" ? 200 : 422,
      contentType: "text/html",
      body: `<turbo-frame id="${renderedFrame}"><h2>Submitted frame</h2></turbo-frame>`
    }))
    await startFrame(page)
    await startFrame(page, { id: "other-frame" })
    await morphPage(page)
    await waitForRequest(page, 2)
    await waitForRequest(page, 2, "other-frame")
    await morphPage(page)

    await page.click(outcome === "success" ? "#target-form button" : "#rejected-form button")
    await expect(page.locator(`#${renderedFrame} h2`)).toHaveText("Submitted frame")
    await finishRequest(page, 2)
    await finishRequest(page, 2, "other-frame")

    await waitForRequest(page, 3, queuedFrame)
    await expectRequestCount(page, 2, renderedFrame)
    await finishRequest(page, 3, queuedFrame)
    await expectRequestCount(page, 3, queuedFrame)
  })
}

for (const cancellation of ["disable", "disconnect", "clear src"]) {
  test(`${cancellation} drops the pending refresh without settling the canceled load`, async ({ page }) => {
    await startQueuedRefresh(page)
    await page.evaluate(cancellation => {
      const frame = document.getElementById("frame")
      window.canceledLoadSettled = false
      frame.loaded.then(() => window.canceledLoadSettled = true)
      if (cancellation === "disable") {
        frame.disabled = true
        frame.disabled = false
      } else if (cancellation === "disconnect") {
        const parent = frame.parentElement
        frame.remove()
        parent.prepend(frame)
      } else {
        const src = frame.src
        frame.src = null
        frame.src = src
      }
    }, cancellation)
    await finishRequest(page, 3)

    await expectRequestCount(page, 3)
    expect(await page.evaluate(() => window.canceledLoadSettled)).toEqual(false)
  })
}

test("an explicit reload forces a request and drops the queued morph refresh", async ({ page }) => {
  await startQueuedRefresh(page)
  await page.evaluate(() => { document.getElementById("frame").reload() })
  await waitForRequest(page, 3)

  await morphPage(page)
  await waitForRequest(page, 4)
  await finishRequest(page, 4)

  await expect(page.locator("#frame h2")).toHaveText("Version 4")
  await expectRequestCount(page, 4)
})

test("removing refresh drops the pending morph refresh", async ({ page }) => {
  await startQueuedRefresh(page)
  await page.evaluate(() => document.getElementById("frame").refresh = null)
  await finishRequest(page, 2)
  await expectRequestCount(page, 2)

  await page.evaluate(() => document.getElementById("frame").refresh = "morph")
  await morphPage(page)
  await finishRequest(page, 3)
  await expectRequestCount(page, 3)
})

test("a superseded response retains its morph context when fetch ignores abort", async ({ page }) => {
  await startFrame(page)
  await page.evaluate(() => {
    const frame = document.getElementById("frame")
    const ignoreAbort = event => {
      if (event.target === frame) {
        document.removeEventListener("turbo:before-fetch-request", ignoreAbort)
        delete event.detail.fetchOptions.signal
      }
    }
    document.addEventListener("turbo:before-fetch-request", ignoreAbort)
  })
  await morphPage(page)
  await waitForRequest(page, 2)
  await page.evaluate(() => {
    const frame = document.getElementById("frame")
    window.previousHeading = document.getElementById("frame-title")
    const navigate = event => {
      if (event.target === frame) {
        document.removeEventListener("turbo:before-fetch-response", navigate)
        frame.src += "&navigation=true"
      }
    }
    document.addEventListener("turbo:before-fetch-response", navigate)
  })
  await finishRequest(page, 2)
  await waitForRequest(page, 3)

  expect(await page.evaluate(() => window.frameMorphs.frame)).toEqual(1)
  expect(await page.evaluate(() => document.getElementById("frame-title") === window.previousHeading)).toEqual(true)
  expect(await page.locator("#frame").evaluate(frame => frame.complete)).toEqual(false)

  await finishRequest(page, 3)
  await expectRequestCount(page, 3)
})

test("morphing does not start an unloaded lazy frame outside the viewport", async ({ page }) => {
  await page.locator("#frame").evaluate((frame, src) => {
    frame.loading = "lazy"
    frame.style.display = "block"
    frame.style.marginTop = "10000px"
    frame.src = src
  }, `${fixturePath}?frame=frame`)
  await morphPage(page)
  await expectRequestCount(page, 0)

  await page.locator("#frame").scrollIntoViewIfNeeded()
  await finishRequest(page, 1)
  await expectRequestCount(page, 1)
})

test("aborting the first lazy response body does not mark the frame as loaded", async ({ page }) => {
  await page.locator("#frame").evaluate(async (frame, src) => {
    let finish, abort
    const finished = new Promise(resolve => finish = resolve)
    const aborted = new Promise(resolve => abort = resolve)
    const requestSucceeded = frame.delegate.requestSucceededWithResponse
    frame.delegate.requestSucceededWithResponse = async function(...args) {
      try {
        return await requestSucceeded.apply(this, args)
      } finally {
        finish()
      }
    }
    frame.addEventListener("turbo:before-fetch-request", event => {
      event.detail.fetchOptions.signal.addEventListener("abort", () => abort(), { once: true })
    }, { once: true })
    const headersReceived = new Promise(resolve => {
      frame.addEventListener("turbo:before-fetch-response", () => resolve(), { once: true })
    })
    frame.loading = "lazy"
    frame.style.display = "block"
    frame.src = "/__turbo/delayed_response_body"
    await headersReceived
    window.canceledLoadSettled = false
    frame.loaded.then(() => window.canceledLoadSettled = true)
    frame.disabled = true
    await aborted
    await finished
    frame.delegate.requestSucceededWithResponse = requestSucceeded

    frame.style.marginTop = "10000px"
    frame.disabled = false
    frame.src = src
  }, `${fixturePath}?frame=frame`)

  await expectRequestCount(page, 1)
  expect(await page.evaluate(() => window.canceledLoadSettled)).toEqual(false)
})

async function startFrame(page, { mode = "eager", id = "frame" } = {}) {
  if (mode === "nested") {
    await page.locator("#parent").evaluate(async (frame, src) => {
      frame.src = src
      await frame.loaded
    }, `${fixturePath}?parent`)
  }
  await page.locator(`#${id}`).evaluate((frame, { mode, src }) => {
    frame.loading = mode === "lazy" ? "lazy" : "eager"
    frame.src = src
  }, { mode, src: `${fixturePath}?frame=${id}` })
  await waitForRequest(page, 1, id)
}

async function startQueuedRefresh(page) {
  await startFrame(page)
  await morphPage(page)
  await waitForRequest(page, 2)
  await morphPage(page)
  await expectRequestCount(page, 2)
}

async function morphPage(page) {
  const morphs = await page.evaluate(() => window.pageMorphs)
  await page.evaluate(async () => {
    const loaded = new Promise(resolve => document.addEventListener("turbo:load", () => resolve(), { once: true }))
    window.Turbo.visit(location.href, { action: "replace" })
    await loaded
    const parent = document.getElementById("parent")
    if (parent.src) await parent.loaded
  })
  expect(await page.evaluate(() => window.pageMorphs)).toEqual(morphs + 1)
}

async function waitForRequest(page, ordinal, id = "frame") {
  const requests = heldRequests.get(page)
  await expect.poll(() => requests.some(request => request.id === id && request.ordinal === ordinal)).toEqual(true)
  return requests.find(request => request.id === id && request.ordinal === ordinal)
}

async function expectRequestCount(page, count, id = "frame") {
  expect(await page.evaluate(id => window.frameRequests[id] || 0, id)).toEqual(count)
}

async function saveFrameLoad(page, key = "frame", id = "frame") {
  await page.evaluate(({ key, id }) => {
    window.savedFrameLoads ||= {}
    window.savedFrameLoads[key] = document.getElementById(id).loaded
  }, { key, id })
}

async function waitForSavedLoad(page, key = "frame") {
  await page.evaluate(key => window.savedFrameLoads[key], key)
}

async function deliverRequest(page, ordinal, id = "frame", response = {}) {
  const request = await waitForRequest(page, ordinal, id)
  request.release(response)
  await request.finished
}

async function finishRequest(page, ordinal, id = "frame", response = {}) {
  await waitForRequest(page, ordinal, id)
  await saveFrameLoad(page, id, id)
  await deliverRequest(page, ordinal, id, response)
  await waitForSavedLoad(page, id)
}

async function pauseFrameRender(page, ordinal) {
  await page.evaluate(ordinal => {
    window.frameRenderPaused = false
    const pause = event => {
      if (event.target.id === "frame" && event.detail.newFrame.querySelector("h2")?.textContent === `Version ${ordinal}`) {
        document.removeEventListener("turbo:before-frame-render", pause)
        event.preventDefault()
        window.resumeFrameRender = event.detail.resume
        window.frameRenderPaused = true
      }
    }
    document.addEventListener("turbo:before-frame-render", pause)
  }, ordinal)
}
