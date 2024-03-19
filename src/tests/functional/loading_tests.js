import { test } from "@playwright/test"
import { assert } from "chai"
import {
  attributeForSelector,
  hasSelector,
  nextAttributeMutationNamed,
  nextBeat,
  nextBody,
  nextEventNamed,
  nextEventOnTarget,
  noNextEventOnTarget,
  readEventLogs
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/loading.html")
  await readEventLogs(page)
})

test("eager loading within a details element", async ({ page }) => {
  await nextBeat()
  assert.ok(await hasSelector(page, "#loading-eager turbo-frame#frame h2"))
  assert.ok(await hasSelector(page, "#loading-eager turbo-frame[complete]"), "has [complete] attribute")
})

test("lazy loading within a details element", async ({ page }) => {
  await nextBeat()

  const frameContents = "#loading-lazy turbo-frame h2"
  assert.notOk(await hasSelector(page, frameContents))
  assert.ok(await hasSelector(page, "#loading-lazy turbo-frame:not([complete])"))

  await page.click("#loading-lazy summary")
  await nextBeat()

  const contents = await page.locator(frameContents)
  assert.equal(await contents.textContent(), "Hello from a frame")
  assert.ok(await hasSelector(page, "#loading-lazy turbo-frame[complete]"), "has [complete] attribute")
})

test("loading after completed lazy loading and restored visit", async ({ page }) => {
  const frameContents = "#loading-lazy turbo-frame h2"
  await page.click("#loading-lazy summary")
  await nextBeat()

  const contents = await page.locator(frameContents)
  assert.equal(await contents.textContent(), "Hello from a frame")
  await page.click("#two")
  await nextBeat()

  await page.goBack()
  await page.click("#hello2")
  await nextBeat()

  const contents2 = await page.locator(frameContents)
  assert.equal(await contents2.textContent(), "Hello 2 from a frame")
})

test("changing loading attribute from lazy to eager loads frame", async ({ page }) => {
  const frameContents = "#loading-lazy turbo-frame h2"
  await nextBeat()

  assert.notOk(await hasSelector(page, frameContents))

  await page.evaluate(() => document.querySelector("#loading-lazy turbo-frame")?.setAttribute("loading", "eager"))
  await nextBeat()

  const contents = await page.locator(frameContents)
  await page.click("#loading-lazy summary")
  assert.equal(await contents.textContent(), "Hello from a frame")
})

test("navigating a visible frame with loading=lazy navigates", async ({ page }) => {
  await page.click("#loading-lazy summary")
  await nextBeat()

  const initialContents = await page.locator("#hello h2")
  assert.equal(await initialContents.textContent(), "Hello from a frame")

  await page.click("#hello a")
  await nextBeat()

  const navigatedContents = await page.locator("#hello h2")
  assert.equal(await navigatedContents.textContent(), "Frames: #hello")
})

test("changing src attribute on a frame with loading=lazy defers navigation", async ({ page }) => {
  const frameContents = "#loading-lazy turbo-frame h2"
  await nextBeat()

  await page.evaluate(() =>
    document.querySelector("#loading-lazy turbo-frame")?.setAttribute("src", "/src/tests/fixtures/frames.html")
  )
  assert.notOk(await hasSelector(page, frameContents))

  await page.click("#loading-lazy summary")
  await nextBeat()

  const contents = await page.locator(frameContents)
  assert.equal(await contents.textContent(), "Frames: #hello")
})

test("changing src attribute on a frame with loading=eager navigates", async ({ page }) => {
  const frameContents = "#loading-eager turbo-frame h2"
  await nextBeat()

  await page.evaluate(() =>
    document.querySelector("#loading-eager turbo-frame")?.setAttribute("src", "/src/tests/fixtures/frames.html")
  )

  await page.click("#loading-eager summary")
  await nextBeat()

  const contents = await page.locator(frameContents)
  assert.equal(await contents.textContent(), "Frames: #frame")
})

test("reloading a frame reloads the content", async ({ page }) => {
  await page.click("#loading-eager summary")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const frameContent = "#loading-eager turbo-frame#frame h2"
  assert.ok(await hasSelector(page, frameContent))
  assert.equal(await nextAttributeMutationNamed(page, "frame", "complete"), "", "has [complete] attribute")

  await page.evaluate(() => document.querySelector("#loading-eager turbo-frame")?.reload())
  assert.ok(await hasSelector(page, frameContent))
  assert.equal(await nextAttributeMutationNamed(page, "frame", "complete"), null, "clears [complete] attribute")
})

test("navigating away from a page does not reload its frames", async ({ page }) => {
  await page.click("#one")
  await nextBody(page)

  const eventLogs = await readEventLogs(page)
  const requestLogs = eventLogs.filter(([name]) => name == "turbo:before-fetch-request")
  assert.equal(requestLogs.length, 1)
})

test("removing the [complete] attribute of an eager frame reloads the content", async ({ page }) => {
  await nextEventOnTarget(page, "frame", "turbo:frame-load")
  await page.evaluate(() => document.querySelector("#loading-eager turbo-frame")?.removeAttribute("complete"))
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  assert.ok(
    await hasSelector(page, "#loading-eager turbo-frame[complete]"),
    "sets the [complete] attribute after re-loading"
  )
})

test("changing [src] attribute on a [complete] frame with loading=lazy defers navigation", async ({ page }) => {
  await page.click("#loading-lazy summary")
  await nextEventOnTarget(page, "hello", "turbo:frame-load")

  assert.ok(await hasSelector(page, "#loading-lazy turbo-frame[complete]"), "lazy frame is complete")
  assert.equal(await page.textContent("#hello h2"), "Hello from a frame")

  await page.click("#loading-lazy summary")
  await page.click("#one")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  assert.ok(await noNextEventOnTarget(page, "hello", "turbo:frame-load"))

  let src = new URL((await attributeForSelector(page, "#hello", "src")) || "")

  assert.ok(await hasSelector(page, "#loading-lazy turbo-frame[complete]"), "lazy frame is complete")
  assert.equal(src.pathname, "/src/tests/fixtures/frames/hello.html", "lazy frame retains [src]")

  await page.click("#link-lazy-frame")

  assert.ok(await noNextEventOnTarget(page, "hello", "turbo:frame-load"))
  assert.ok(await hasSelector(page, "#loading-lazy turbo-frame:not([complete])"), "lazy frame is not complete")

  await page.click("#loading-lazy summary")
  await nextEventOnTarget(page, "hello", "turbo:frame-load")

  src = new URL((await attributeForSelector(page, "#hello", "src")) || "")

  assert.equal(await page.textContent("#loading-lazy turbo-frame h2"), "Frames: #hello")
  assert.ok(await hasSelector(page, "#loading-lazy turbo-frame[complete]"), "lazy frame is complete")
  assert.equal(src.pathname, "/src/tests/fixtures/frames.html", "lazy frame navigates")
})

test("navigating away from a page and then back does not reload its frames", async ({ page }) => {
  await page.click("#one")
  await nextBody(page)
  await readEventLogs(page)
  await page.goBack()
  await nextBody(page)

  const eventLogs = await readEventLogs(page)
  const requestLogs = eventLogs.filter(([name]) => name == "turbo:before-fetch-request")
  const requestsOnEagerFrame = requestLogs.filter((record) => record[2] == "frame")
  const requestsOnLazyFrame = requestLogs.filter((record) => record[2] == "hello")

  assert.equal(requestsOnEagerFrame.length, 0, "does not reload eager frame")
  assert.equal(requestsOnLazyFrame.length, 0, "does not reload lazy frame")

  await page.click("#loading-lazy summary")
  await nextEventOnTarget(page, "hello", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "hello", "turbo:frame-render")
  await nextEventOnTarget(page, "hello", "turbo:frame-load")
})

test("disconnecting and reconnecting a frame does not reload the frame", async ({ page }) => {
  await nextBeat()

  await page.evaluate(() => {
    window.savedElement = document.querySelector("#loading-eager")
    window.savedElement?.remove()
  })
  await nextBeat()

  await page.evaluate(() => {
    if (window.savedElement) {
      document.body.appendChild(window.savedElement)
    }
  })
  await nextBeat()

  const eventLogs = await readEventLogs(page)
  const requestLogs = eventLogs.filter(([name]) => name == "turbo:before-fetch-request")
  assert.equal(requestLogs.length, 0)
})
