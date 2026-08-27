import { expect, test } from "@playwright/test"
import {
  attributeForSelector,
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
  await expect(page.locator("#loading-eager turbo-frame#frame h2")).toBeAttached()
  await expect(page.locator("#loading-eager turbo-frame"), "has [complete] attribute").toHaveAttribute("complete")
})

test("lazy loading within a details element", async ({ page }) => {
  await expect(page.locator("#loading-lazy turbo-frame h2")).not.toBeAttached()
  await expect(page.locator("#loading-lazy turbo-frame")).not.toHaveAttribute("complete")

  await page.click("#loading-lazy summary")

  await expect(page.locator("#loading-lazy turbo-frame h2")).toHaveText("Hello from a frame")
  await expect(page.locator("#loading-lazy turbo-frame"), "has [complete] attribute").toHaveAttribute("complete")
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
  const frame = page.locator("#loading-lazy turbo-frame")

  await expect(frame.locator("h2")).not.toBeAttached()

  await frame.evaluate((frame) => frame.setAttribute("loading", "eager"))

  await page.click("#loading-lazy summary")
  await expect(frame.locator("h2")).toHaveText("Hello from a frame")
})

test("navigating a visible frame with loading=lazy navigates", async ({ page }) => {
  await page.click("#loading-lazy summary")

  await expect(page.locator("#hello h2")).toHaveText("Hello from a frame")

  await page.click("#hello a")

  await expect(page.locator("#hello h2")).toHaveText("Frames: #hello")
})

test("changing src attribute on a frame with loading=lazy defers navigation", async ({ page }) => {
  const frame = page.locator("#loading-lazy turbo-frame")

  await frame.evaluate((frame) =>
    frame.setAttribute("src", "/src/tests/fixtures/frames.html")
  )
  await expect(frame.locator("h2")).not.toBeAttached()

  await page.click("#loading-lazy summary")

  await expect(frame.locator("h2")).toHaveText("Frames: #hello")
})

test("changing src attribute on a frame with loading=eager navigates", async ({ page }) => {
  const frame = page.locator("#loading-eager turbo-frame")

  await frame.evaluate((frame) =>
    frame.setAttribute("src", "/src/tests/fixtures/frames.html")
  )

  await page.click("#loading-eager summary")

  await expect(frame.locator("h2")).toHaveText("Frames: #frame")
})

test("reloading a frame reloads the content", async ({ page }) => {
  await page.click("#loading-eager summary")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const frame = page.locator("#loading-eager turbo-frame#frame")
  await expect(frame.locator("h2")).toBeAttached()
  expect(await nextAttributeMutationNamed(page, "frame", "complete"), "has [complete] attribute").toEqual("")

  await frame.evaluate((frame) => frame.reload())
  await expect(frame.locator("h2")).toBeAttached()
  expect(await nextAttributeMutationNamed(page, "frame", "complete"), "clears [complete] attribute").toEqual(null)
})

test("navigating away from a page does not reload its frames", async ({ page }) => {
  await page.click("#one")
  await nextBody(page)

  const eventLogs = await readEventLogs(page)
  const requestLogs = eventLogs.filter(([name]) => name == "turbo:before-fetch-request")
  expect(requestLogs.length).toEqual(1)
})

test("changing [src] attribute on a [complete] frame with loading=lazy defers navigation", async ({ page }) => {
  await page.click("#loading-lazy summary")
  await nextEventOnTarget(page, "hello", "turbo:frame-load")

  await expect(page.locator("#loading-lazy turbo-frame"), "lazy frame is complete").toHaveAttribute("complete")
  await expect(page.locator("#hello h2")).toHaveText("Hello from a frame")

  await page.click("#loading-lazy summary")
  await page.click("#one")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  expect(await noNextEventOnTarget(page, "hello", "turbo:frame-load")).toBeTruthy()

  let src = new URL((await attributeForSelector(page, "#hello", "src")) || "")

  await expect(page.locator("#loading-lazy turbo-frame"), "lazy frame is complete").toHaveAttribute("complete")
  expect(src.pathname, "lazy frame retains [src]").toEqual("/src/tests/fixtures/frames/hello.html")

  await page.click("#link-lazy-frame")

  expect(await noNextEventOnTarget(page, "hello", "turbo:frame-load")).toBeTruthy()
  await expect(page.locator("#loading-lazy turbo-frame"), "lazy frame is not complete").not.toHaveAttribute("complete")

  await page.click("#loading-lazy summary")
  await nextEventOnTarget(page, "hello", "turbo:frame-load")

  src = new URL((await attributeForSelector(page, "#hello", "src")) || "")

  await expect(page.locator("#loading-lazy turbo-frame h2")).toHaveText("Frames: #hello")
  await expect(page.locator("#loading-lazy turbo-frame"), "lazy frame is complete").toHaveAttribute("complete")
  expect(src.pathname, "lazy frame navigates").toEqual("/src/tests/fixtures/frames.html")
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

  expect(requestsOnEagerFrame.length, "does not reload eager frame").toEqual(0)
  expect(requestsOnLazyFrame.length, "does not reload lazy frame").toEqual(0)

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
  expect(requestLogs.length).toEqual(0)
})
