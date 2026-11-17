import { expect, test } from "@playwright/test"
import { nextEventNamed, readEventLogs, scrollPosition, withHash } from "../helpers/page"

const fixturePath = "/src/tests/fixtures/native_fragment_history.html"
const visitEvents = [
  "turbo:before-visit",
  "turbo:visit",
  "turbo:before-cache",
  "turbo:before-render",
  "turbo:render",
  "turbo:load"
]

test.beforeEach(async ({ page }) => {
  await page.goto(fixturePath)
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
  await page.locator("#client-input").fill("Client input state")
  await page.evaluate(() => {
    window.originalFragmentBody = document.body
    window.originalFragmentWidget = document.getElementById("widget")
    window.originalFragmentRuntime = document.querySelector("[data-widget-runtime]")
    document.getElementById("widget").insertAdjacentHTML("beforeend", '<span id="client-marker">Live client state</span>')
  })
  await readEventLogs(page)
})

test("native fragment history preserves the active document through the initial entry", async ({ page }) => {
  await changeFragment(page, () => page.click("#link-one"), "#one")
  await changeFragment(page, () => page.click("#link-two"), "#two")
  await changeFragment(page, () => page.goBack(), "#one")
  await changeFragment(page, () => page.goBack(), "")
  await changeFragment(page, () => page.goForward(), "#one")
  await changeFragment(page, () => page.goForward(), "#two")

  const events = (await readEventLogs(page)).map(([name]) => name)
  expect(events.filter(name => visitEvents.includes(name))).toEqual([])
  expect(await page.evaluate(() => document.body === window.originalFragmentBody)).toEqual(true)
  expect(await page.evaluate(() => document.getElementById("widget") === window.originalFragmentWidget)).toEqual(true)
  expect(await page.evaluate(() => document.querySelector("[data-widget-runtime]") === window.originalFragmentRuntime)).toEqual(true)
  await expect(page.locator("#client-marker")).toHaveText("Live client state")
  await expect(page.locator("#client-input")).toHaveValue("Client input state")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
  await expect(page.locator("#temporary")).toHaveText("Temporary UI")
})

test("a Drive visit after a fragment prepares its snapshot and restores one widget", async ({ page }) => {
  await changeFragment(page, () => page.click("#link-one"), "#one")
  await expect(page.locator("#client-marker")).toHaveText("Live client state")
  await expect(page.locator("#temporary")).toBeVisible()

  await page.click("#drive-link")
  await nextEventNamed(page, "turbo:load")
  await expect(page.locator("h1")).toHaveText("One")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withHash("#one"))
  await expect(page.locator("#client-marker")).toHaveText("Prepared client state")
  await expect(page.locator("#client-input")).toHaveValue("Client input state")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
  await expect(page.locator("#temporary")).not.toBeAttached()
})

test("an explicit Drive visit to another fragment creates a different document", async ({ page }) => {
  await changeFragment(page, () => page.click("#link-one"), "#one")

  await page.evaluate(path => window.Turbo.visit(`${path}#two`), fixturePath)
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withHash("#two"))
  expect(await page.evaluate(() => document.body === window.originalFragmentBody)).toEqual(false)
  await expect(page.locator("#client-marker")).not.toBeAttached()
  await expect(page.locator("#client-input")).toHaveValue("")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withHash("#one"))
  await expect(page.locator("#client-marker")).toHaveText("Prepared client state")
  await expect(page.locator("#client-input")).toHaveValue("Client input state")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)

  await page.goForward()
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withHash("#two"))
  await expect(page.locator("#client-marker")).not.toBeAttached()
  await expect(page.locator("#client-input")).toHaveValue("")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
})

test("native fragment history restores each entry's scroll position", async ({ page }) => {
  await changeFragmentAndWaitForScroll(page, () => page.click("#link-one"), "#one")
  const firstPosition = await scrollInsideFragment(page, "one", 120)
  await changeFragmentAndWaitForScroll(page, () => page.click("#link-two"), "#two")
  const secondPosition = await scrollInsideFragment(page, "two", 160)

  await changeFragmentAndWaitForScroll(page, () => page.goBack(), "#one")
  await expectScrollPosition(page, firstPosition)

  await changeFragmentAndWaitForScroll(page, () => page.goForward(), "#two")
  await expectScrollPosition(page, secondPosition)

  const events = (await readEventLogs(page)).map(([name]) => name)
  expect(events.filter(name => visitEvents.includes(name))).toEqual([])
  expect(await page.evaluate(() => document.body === window.originalFragmentBody)).toEqual(true)
})

test("Back during a paused Drive render restores the fragment's document", async ({ page }) => {
  await changeFragment(page, () => page.click("#link-one"), "#one")
  await pauseNextOneRender(page)
  await page.click("#drive-link")
  await page.waitForFunction(() => window.pendingPageRenderPaused)

  await observePageLoad(page, fixturePath, "Native fragment history", "#one")
  await page.goBack({ waitUntil: "commit" })
  await expect(page).toHaveURL(new URL(`${fixturePath}#one`, page.url()).href)

  await page.evaluate(async () => {
    window.resumePendingPageRender()
    await Promise.all([window.pendingPageRenderFinished, window.expectedPageLoad])
  })

  await expect(page).toHaveURL(new URL(`${fixturePath}#one`, page.url()).href)
  await expect(page.locator("h1")).toHaveText("Native fragment history")
  await expect(page.locator("#client-marker")).toHaveText("Prepared client state")
  await expect(page.locator("#client-input")).toHaveValue("Client input state")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
})

test("fragments created during a paused Drive render belong to its destination", async ({ page }) => {
  await changeFragment(page, () => page.click("#link-one"), "#one")
  await pauseNextOneRender(page)
  await page.click("#drive-link")
  await page.waitForFunction(() => window.pendingPageRenderPaused)

  await changeFragment(page, () => page.evaluate(() => window.location.hash = "first-fragment"), "#first-fragment")
  await changeFragment(page, () => page.evaluate(() => window.location.hash = "second-fragment"), "#second-fragment")
  await observePageLoad(page, "/src/tests/fixtures/one.html", "One", "#second-fragment")
  await page.evaluate(async () => {
    window.resumePendingPageRender()
    await Promise.all([window.pendingPageRenderFinished, window.expectedPageLoad])
  })

  await expect(page.locator("h1")).toHaveText("One")
  await page.evaluate(() => {
    window.destinationFragmentBody = document.body
    document.body.insertAdjacentHTML("beforeend", '<div id="destination-marker">Destination client state</div>')
  })
  await readEventLogs(page)

  await changeFragment(page, () => page.goBack(), "#first-fragment")
  await changeFragment(page, () => page.goForward(), "#second-fragment")

  const events = (await readEventLogs(page)).map(([name]) => name)
  expect(events.filter(name => visitEvents.includes(name))).toEqual([])
  expect(await page.evaluate(() => document.body === window.destinationFragmentBody)).toEqual(true)
  await expect(page.locator("h1")).toHaveText("One")
  await expect(page.locator("#destination-marker")).toHaveText("Destination client state")
})

test("a fragment created during a promoted frame render belongs to the advanced page", async ({ page }) => {
  await pauseNextFrameRender(page)
  await page.click("#promoted-frame-link")
  await page.waitForFunction(() => window.pendingFrameRenderPaused)
  await changeFragment(page, () => page.evaluate(() => window.location.hash = "promoted-fragment"), "#promoted-fragment")
  await page.evaluate(async () => {
    window.resumePendingFrameRender()
    await window.pendingFrameResponseFinished
    window.promotedFragmentBody = document.body
  })
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  await readEventLogs(page)

  await changeFragment(page, () => page.goBack(), "")

  const events = (await readEventLogs(page)).map(([name]) => name)
  expect(events.filter(name => visitEvents.includes(name))).toEqual([])
  expect(await page.evaluate(() => document.body === window.promotedFragmentBody)).toEqual(true)
  await expect(page).toHaveURL(new URL("/src/tests/fixtures/frames/frame.html", page.url()).href)
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(new URL(fixturePath, page.url()).href)
  await expect(page.locator("#frame h2")).toHaveText("Original frame")
  await expect(page.locator("#client-input")).toHaveValue("Client input state")
})

test("Back before a promoted frame renders leaves the original page active", async ({ page }) => {
  await pauseNextFrameRender(page)
  await page.click("#promoted-frame-link")
  await page.waitForFunction(() => window.pendingFrameRenderPaused)
  await observePageLoad(page, fixturePath, "Native fragment history", "")
  await page.evaluate(() => {
    window.pendingFrameVisits = []
    document.addEventListener("turbo:visit", event => window.pendingFrameVisits.push(event.detail.url))
  })

  await page.goBack({ waitUntil: "commit" })
  await page.evaluate(async () => {
    if (window.Turbo.navigator.currentVisit?.state === "started") await window.expectedPageLoad
    window.resumePendingFrameRender()
    try {
      await window.pendingFrameResponseFinished
    } catch (error) {
      if (error.name !== "AbortError") throw error
    }
  })

  await expect(page).toHaveURL(new URL(fixturePath, page.url()).href)
  await expect(page.locator("h1")).toHaveText("Native fragment history")
  await expect(page.locator("#frame h2")).toHaveText("Original frame")
  expect(await page.evaluate(() => window.pendingFrameVisits.some(url => (
    new URL(url).pathname === "/src/tests/fixtures/frames/frame.html"
  )))).toEqual(false)
})

async function changeFragment(page, action, hash) {
  await page.evaluate(hash => {
    window.expectedFragmentChange = new Promise(resolve => {
      const changed = () => {
        if (window.location.hash === hash) {
          window.removeEventListener("hashchange", changed)
          queueMicrotask(resolve)
        }
      }
      window.addEventListener("hashchange", changed)
    })
  }, hash)
  await action()
  await page.evaluate(() => window.expectedFragmentChange)
  await expect(page).toHaveURL(withHash(hash))
}

async function pauseNextOneRender(page) {
  await page.evaluate(() => {
    window.pendingPageRenderPaused = false
    const pause = event => {
      if (event.detail.newBody.querySelector("h1")?.textContent === "One") {
        document.removeEventListener("turbo:before-render", pause)
        event.preventDefault()
        window.resumePendingPageRender = event.detail.resume
        window.pendingPageRenderFinished = window.Turbo.session.view.renderPromise
        window.pendingPageRenderPaused = true
      }
    }
    document.addEventListener("turbo:before-render", pause)
  })
}

async function pauseNextFrameRender(page) {
  await page.evaluate(() => {
    const controller = document.getElementById("frame").delegate
    const requestSucceededWithResponse = controller.requestSucceededWithResponse
    controller.requestSucceededWithResponse = function (request, response) {
      this.requestSucceededWithResponse = requestSucceededWithResponse
      const handling = requestSucceededWithResponse.call(this, request, response)
      window.pendingFrameResponseFinished = handling
      return handling
    }
    window.pendingFrameRenderPaused = false
    const pause = event => {
      if (event.target.id === "frame") {
        document.removeEventListener("turbo:before-frame-render", pause)
        event.preventDefault()
        window.resumePendingFrameRender = event.detail.resume
        window.pendingFrameRenderPaused = true
      }
    }
    document.addEventListener("turbo:before-frame-render", pause)
  })
}

async function observePageLoad(page, pathname, title, hash) {
  await page.evaluate(({ pathname, title, hash }) => {
    window.expectedPageLoad = new Promise(resolve => {
      const loaded = () => {
        if (
          window.location.pathname === pathname && window.location.hash === hash &&
          document.querySelector("h1")?.textContent === title
        ) {
          document.removeEventListener("turbo:load", loaded)
          resolve()
        }
      }
      document.addEventListener("turbo:load", loaded)
    })
  }, { pathname, title, hash })
}

async function scrollInsideFragment(page, id, offset) {
  const requestedPosition = await page.evaluate(({ id, offset }) => {
    const y = document.getElementById(id).offsetTop + offset
    window.expectedScrollEnd = new Promise(resolve => {
      document.addEventListener("scrollend", resolve, { once: true })
    })
    window.scrollTo({ left: 0, top: y, behavior: "instant" })
    return { x: 0, y }
  }, { id, offset })
  await page.evaluate(() => window.expectedScrollEnd)
  await expectScrollPosition(page, requestedPosition)
  const position = await scrollPosition(page)
  await expect.poll(() => page.evaluate(() => {
    const history = window.Turbo.session.history
    return history.getRestorationDataForIdentifier(history.restorationIdentifier).scrollPosition
  })).toEqual(position)
  return position
}

async function changeFragmentAndWaitForScroll(page, action, hash) {
  await page.evaluate(() => {
    window.expectedScrollEnd = new Promise(resolve => {
      document.addEventListener("scrollend", resolve, { once: true })
    })
  })
  await changeFragment(page, action, hash)
  await page.evaluate(() => window.expectedScrollEnd)
}

async function expectScrollPosition(page, expectedPosition) {
  // Browsers can quantize fractional scroll offsets when restoring.
  await expect.poll(async () => {
    const { y } = await scrollPosition(page)
    return Math.abs(y - expectedPosition.y)
  }).toBeLessThanOrEqual(2)
  expect((await scrollPosition(page)).x).toEqual(expectedPosition.x)
}
