import { expect, test } from "@playwright/test"

const fixturePath = "/src/tests/fixtures/frame_lazy.html"
const heldRequests = new WeakMap()

test.beforeEach(async ({ page }) => {
  const requests = []
  heldRequests.set(page, requests)
  await page.route(`**${fixturePath}?frame=*`, route => {
    const url = new URL(route.request().url())
    const id = url.searchParams.get("frame")
    const version = url.searchParams.get("version")
    const ordinal = requests.filter(request => request.id === id).length + 1
    let release
    const released = new Promise(resolve => release = resolve)
    const request = { id, ordinal, url, release }
    requests.push(request)
    request.finished = (async () => {
      await released
      if (!route.request().failure()) {
        await route.fulfill({
          contentType: "text/html",
          body: `<turbo-frame id="${id}"><h2>Version ${version}</h2><input id="${id}-input"></turbo-frame>`
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

test("loaded waits for a future lazy request and its render before focusing", async ({ page }) => {
  expect(await page.evaluate(() => window.initialLoadSettled)).toEqual(false)
  await expectRequestCount(page, 0)
  await pauseFrameRender(page)
  await page.click("#lazy-menu summary")
  await waitForRequest(page, 1)
  expect(await page.evaluate(() => window.initialLoadSettled)).toEqual(false)

  await deliverRequest(page, 1)
  await page.waitForFunction(() => window.frameRenderPaused)
  expect(await page.evaluate(() => window.initialLoadSettled)).toEqual(false)
  await page.evaluate(() => window.resumeFrameRender())
  await page.evaluate(() => window.initialFrameLoad)

  await expect(page.locator("#frame-input")).toBeFocused()
  await expectRequestCount(page, 1)
})

for (const pause of ["disable", "disconnect"]) {
  test(`${pause} before loading preserves the original lazy wait`, async ({ page }) => {
    await page.locator("#frame").evaluate((frame, pause) => {
      if (pause === "disable") {
        frame.disabled = true
        frame.disabled = false
      } else {
        const parent = frame.parentElement
        frame.remove()
        parent.prepend(frame)
      }
    }, pause)
    expect(await page.locator("#frame").evaluate(frame => frame.loaded === window.initialFrameLoad)).toEqual(true)
    expect(await page.evaluate(() => window.initialLoadSettled)).toEqual(false)
    await expectRequestCount(page, 0)

    await openMenu(page)
    await finishRequest(page, 1)
    await page.evaluate(() => window.initialFrameLoad)
    await expect(page.locator("#frame-input")).toBeFocused()
  })
}

for (const state of ["complete", "no source", "disabled", "disconnected"]) {
  test(`an initially ${state} lazy frame does not create a pending load`, async ({ page }) => {
    await page.evaluate(({ state, src }) => {
      const previous = document.getElementById("frame")
      const frame = document.createElement("turbo-frame")
      frame.id = "frame"
      frame.loading = "lazy"
      if (state !== "no source") frame.src = src
      if (state === "complete") frame.setAttribute("complete", "")
      if (state === "disabled") frame.disabled = true
      if (state === "disconnected") {
        previous.remove()
        window.detachedFrame = frame
      } else {
        previous.replaceWith(frame)
      }
      window.inactiveFrameLoad = frame.loaded
    }, { state, src: frameSource() })
    await page.evaluate(() => window.inactiveFrameLoad)
    await expectRequestCount(page, 0)

    if (state === "complete") {
      await page.locator("#frame").evaluate(frame => {
        frame.remove()
        document.getElementById("lazy-menu").append(frame)
      })
      await page.locator("#frame").evaluate(frame => frame.loaded)
      await openMenu(page)
      await expect(page.locator("#frame")).toHaveAttribute("complete")
    } else {
      await page.evaluate(({ state, src }) => {
        if (state === "disconnected") document.getElementById("lazy-menu").append(window.detachedFrame)
        const frame = document.getElementById("frame")
        if (state === "no source") frame.src = src
        if (state === "disabled") frame.disabled = false
      }, { state, src: frameSource() })
      await saveFrameLoad(page, "activated")
      await expectPendingLoad(page, "activated")
      await openMenu(page)
      await finishRequest(page, 1)
      await waitForSavedLoad(page, "activated")
    }
  })
}

test("changing src before appearing preserves the wait and loads the new source", async ({ page }) => {
  await page.locator("#frame").evaluate((frame, src) => frame.src = src, frameSource("frame", "B"))
  expect(await page.locator("#frame").evaluate(frame => frame.loaded === window.initialFrameLoad)).toEqual(true)
  await expectRequestCount(page, 0)

  await openMenu(page)
  const request = await waitForRequest(page, 1)
  expect(request.url.searchParams.get("version")).toEqual("B")
  await finishRequest(page, 1)
  await page.evaluate(() => window.initialFrameLoad)
  await expect(page.locator("#frame h2")).toHaveText("Version B")
})

test("clearing src retires its wait without resolving it", async ({ page }) => {
  await page.locator("#frame").evaluate((frame, src) => {
    frame.src = null
    frame.src = src
  }, frameSource("frame", "B"))
  expect(await page.locator("#frame").evaluate(frame => frame.loaded === window.initialFrameLoad)).toEqual(false)
  await saveFrameLoad(page, "replacement")
  await expectPendingLoad(page, "replacement")

  await openMenu(page)
  await finishRequest(page, 1)
  await waitForSavedLoad(page, "replacement")
  expect(await page.evaluate(() => window.initialLoadSettled)).toEqual(false)
})

test("switching loading styles preserves the wait without duplicating the request", async ({ page }) => {
  await page.locator("#frame").evaluate(frame => frame.loading = "eager")
  await waitForRequest(page, 1)
  await saveFrameLoad(page, "active")
  await page.locator("#frame").evaluate(frame => frame.loading = "lazy")
  expect(await page.locator("#frame").evaluate(frame => frame.loaded === window.savedFrameLoads.active)).toEqual(true)
  expect(await page.evaluate(() => window.initialLoadSettled)).toEqual(false)

  await finishRequest(page, 1)
  await page.evaluate(() => window.initialFrameLoad)
  await expectRequestCount(page, 1)
})

test("a superseded render cannot resolve a later lazy wait", async ({ page }) => {
  await openMenu(page)
  await waitForRequest(page, 1)
  await saveFrameLoad(page, "firstRequest")
  await pauseFrameRender(page)
  await deliverRequest(page, 1)
  await page.waitForFunction(() => window.frameRenderPaused)

  await reconnectHiddenFrame(page, frameSource("frame", "B"))
  await saveFrameLoad(page, "replacement")
  await page.locator("#frame").evaluate(frame => frame.loading = "eager")
  await waitForRequest(page, 2)
  await page.evaluate(() => window.resumeFrameRender())
  await waitForSavedLoad(page, "firstRequest")

  expect(await page.evaluate(() => window.initialLoadSettled)).toEqual(true)
  await expectPendingLoad(page, "replacement")
  expect(await page.locator("#frame").evaluate(frame => frame.complete)).toEqual(false)
  await finishRequest(page, 2)
  await waitForSavedLoad(page, "replacement")
  await expect(page.locator("#frame h2")).toHaveText("Version B")
})

test("a canceled request does not resolve when a later lazy load finishes", async ({ page }) => {
  await openMenu(page)
  await waitForRequest(page, 1)
  await saveFrameLoad(page, "canceled")
  await reconnectHiddenFrame(page, frameSource("frame", "B"))
  await saveFrameLoad(page, "replacement")

  await openMenu(page)
  await finishRequest(page, 2)
  await waitForSavedLoad(page, "replacement")
  await expectPendingLoad(page, "canceled")
  expect(await page.evaluate(() => window.initialLoadSettled)).toEqual(false)
})

for (const activation of ["adding src", "enabling"]) {
  test(`${activation} to an already visible lazy frame starts its pending load`, async ({ page }) => {
    await page.evaluate(async ({ activation, src }) => {
      document.getElementById("frame").remove()
      const frame = document.createElement("turbo-frame")
      frame.id = "frame"
      frame.loading = "lazy"
      frame.style.display = "block"
      frame.textContent = "Waiting"
      if (activation === "enabling") {
        frame.disabled = true
        frame.src = src
      }
      document.body.append(frame)
      await new Promise(resolve => {
        const observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            observer.disconnect()
            resolve()
          }
        })
        observer.observe(frame)
      })
    }, { activation, src: frameSource() })
    await expectRequestCount(page, 0)
    await page.locator("#frame").evaluate((frame, { activation, src }) => {
      if (activation === "adding src") frame.src = src
      else frame.disabled = false
    }, { activation, src: frameSource() })
    await saveFrameLoad(page, "activated")
    await finishRequest(page, 1)
    await waitForSavedLoad(page, "activated")
    await expectRequestCount(page, 1)
  })
}

for (const outcome of ["success", "rejected"]) {
  test(`a ${outcome} form retires only the rendered frame's lazy wait`, async ({ page }) => {
    const renderedFrame = outcome === "success" ? "other-frame" : "frame"
    const waitingFrame = outcome === "success" ? "frame" : "other-frame"
    await page.route(`**${fixturePath}?form=${outcome}`, route => route.fulfill({
      status: outcome === "success" ? 200 : 422,
      contentType: "text/html",
      body: `<turbo-frame id="${renderedFrame}"><h2>Submitted frame</h2></turbo-frame>`
    }))
    await page.locator("#other-frame").evaluate((frame, src) => frame.src = src, frameSource("other-frame"))
    await saveFrameLoad(page, "frame")
    await saveFrameLoad(page, "other-frame", "other-frame")
    await page.locator(outcome === "success" ? "#target-form" : "#rejected-form").evaluate(form => form.requestSubmit())
    await expect(page.locator(`#${renderedFrame} h2`)).toHaveText("Submitted frame")

    await openMenu(page)
    await finishRequest(page, 1, waitingFrame)
    await waitForSavedLoad(page, waitingFrame)
    await expectPendingLoad(page, renderedFrame)
    await expectRequestCount(page, 0, renderedFrame)
    await expectRequestCount(page, 1, waitingFrame)

    await page.locator(`#${renderedFrame}`).evaluate((frame, src) => frame.src = src, frameSource(renderedFrame, "B"))
    await finishRequest(page, 1, renderedFrame)
    await expectPendingLoad(page, renderedFrame)
  })
}

function frameSource(id = "frame", version = "A") {
  return `${fixturePath}?frame=${id}&version=${version}`
}

async function openMenu(page) {
  await page.locator("#lazy-menu").evaluate(menu => menu.open = true)
}

async function reconnectHiddenFrame(page, src) {
  await page.locator("#frame").evaluate((frame, src) => {
    const menu = document.getElementById("lazy-menu")
    menu.open = false
    frame.remove()
    frame.src = src
    menu.prepend(frame)
  }, src)
}

async function waitForRequest(page, ordinal, id = "frame") {
  const requests = heldRequests.get(page)
  await expect.poll(() => requests.some(request => request.id === id && request.ordinal === ordinal)).toEqual(true)
  return requests.find(request => request.id === id && request.ordinal === ordinal)
}

async function expectRequestCount(page, count, id = "frame") {
  expect(await page.evaluate(id => window.frameRequests[id] || 0, id)).toEqual(count)
}

async function saveFrameLoad(page, key, id = "frame") {
  await page.evaluate(({ key, id }) => {
    window.savedFrameLoads ||= {}
    window.savedLoadsSettled ||= {}
    window.savedFrameLoads[key] = document.getElementById(id).loaded
    window.savedLoadsSettled[key] = false
    window.savedFrameLoads[key].then(() => window.savedLoadsSettled[key] = true)
  }, { key, id })
}

async function waitForSavedLoad(page, key) {
  await page.evaluate(key => window.savedFrameLoads[key], key)
}

async function expectPendingLoad(page, key) {
  expect(await page.evaluate(key => window.savedLoadsSettled[key], key)).toEqual(false)
}

async function deliverRequest(page, ordinal, id = "frame") {
  const request = await waitForRequest(page, ordinal, id)
  request.release()
  await request.finished
}

async function finishRequest(page, ordinal, id = "frame") {
  await waitForRequest(page, ordinal, id)
  const key = `request-${id}`
  await saveFrameLoad(page, key, id)
  await deliverRequest(page, ordinal, id)
  await waitForSavedLoad(page, key)
}

async function pauseFrameRender(page) {
  await page.evaluate(() => {
    window.frameRenderPaused = false
    const pause = event => {
      if (event.target.id === "frame") {
        document.removeEventListener("turbo:before-frame-render", pause)
        event.preventDefault()
        window.resumeFrameRender = event.detail.resume
        window.frameRenderPaused = true
      }
    }
    document.addEventListener("turbo:before-frame-render", pause)
  })
}
