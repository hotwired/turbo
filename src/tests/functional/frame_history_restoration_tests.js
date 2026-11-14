import { expect, test } from "@playwright/test"

const sourcePath = "/src/tests/fixtures/frames.html"
const framePath = "/src/tests/fixtures/frames/frame.html"

test.beforeEach(async ({ page }) => {
  await page.goto(sourcePath)
  await page.evaluate(() => {
    document.querySelector("h1").textContent = "Original client state"
    document.body.setAttribute("data-frame-history", "client")
    window.frameHistoryDocument = document
    window.frameHistoryPageLoads = []
    window.frameHistoryFrameLoads = 0
    addEventListener("turbo:load", ({ detail }) => window.frameHistoryPageLoads.push(detail.url))
    addEventListener("turbo:frame-load", ({ target }) => {
      if (target.id === "frame") window.frameHistoryFrameLoads++
    })
  })
})

test("Back from frame-load preserves both promoted history snapshots", async ({ page }) => {
  await page.locator("#frame").evaluate((frame, path) => {
    frame.addEventListener("turbo:frame-load", () => {
      const snapshot = window.Turbo.session.view.snapshotCache.get(new URL(path, location.href))
      window.snapshotAtFrameLoad = snapshot && {
        heading: snapshot.element.querySelector("h1")?.textContent,
        frame: snapshot.element.querySelector("#frame h2")?.textContent,
        marker: snapshot.element.getAttribute("data-frame-history")
      }
      history.back()
    }, { once: true })
  }, sourcePath)

  await page.locator("#link-outside-frame-action-advance").evaluate((link) => link.click())
  await waitForPageLoad(page, sourcePath)

  expect(await page.evaluate(() => window.snapshotAtFrameLoad)).toEqual({
    heading: "Original client state",
    frame: "Frames: #frame",
    marker: "client"
  })
  await expectHistoryPage(page, sourcePath, "Frames: #frame")

  await page.goForward()
  await expectHistoryPage(page, framePath, "Frame: Loaded")
  await expect.poll(() => cachedFrameText(page, sourcePath)).toEqual("Frames: #frame")

  await page.goBack()
  await expectHistoryPage(page, sourcePath, "Frames: #frame")
})

test("a bare frame src write after promotion does not inherit its history action", async ({ page }) => {
  await page.locator("#link-outside-frame-action-advance").evaluate((link) => link.click())
  await expectHistoryPage(page, framePath, "Frame: Loaded")
  await expect.poll(() => cachedFrameText(page, sourcePath)).toEqual("Frames: #frame")
  const before = await page.evaluate(() => ({ url: location.href, length: history.length }))
  const directURL = new URL(`${framePath}?direct=1`, page.url()).href

  await page.locator("#frame").evaluate((frame, url) => frame.src = url, directURL)
  await page.waitForFunction(() => window.frameHistoryFrameLoads >= 2)

  await expect(page.locator("#frame")).toHaveAttribute("src", directURL)
  expect(await page.evaluate(() => ({ url: location.href, length: history.length }))).toEqual(before)
  await expect(page.locator("h1")).toHaveText("Original client state")
  expect(await page.evaluate(() => window.frameHistoryDocument === document)).toEqual(true)
})

for (const { name, destination, frameText, renderMethod } of [
  { name: "a different pathname", destination: framePath, frameText: "Frame: Loaded", renderMethod: "replace" },
  { name: "the same pathname", destination: `${sourcePath}?replace=same-path`, frameText: "Frames: #frame", renderMethod: "morph" }
]) {
  test(`a cached replace promotion with ${name} preserves its render method and page`, async ({ page }) => {
    await page.locator("#link-outside-frame-action-advance").evaluate((link, path) => link.href = path, destination)
    await page.locator("#link-outside-frame-action-advance").evaluate((link) => link.click())
    await expectHistoryPage(page, destination, frameText)
    await page.goBack()
    await expectHistoryPage(page, sourcePath, "Frames: #frame")
    await expect.poll(() => cachedFrameText(page, destination)).toEqual(frameText)

    const historyLength = await page.evaluate(() => {
      const meta = document.createElement("meta")
      meta.name = "turbo-refresh-method"
      meta.content = "morph"
      document.head.append(meta)
      document.getElementById("link-outside-frame-action-advance").setAttribute("data-turbo-action", "replace")
      window.replacePromotionBody = document.body
      window.replacePromotionDocument = document
      window.replaceBodyMorphs = 0
      window.replaceRenderMethods = []
      window.frameHistoryPageLoads = []
      addEventListener("turbo:morph", ({ detail }) => {
        if (detail.currentElement === window.replacePromotionBody) window.replaceBodyMorphs++
      })
      addEventListener("turbo:render", ({ detail }) => window.replaceRenderMethods.push(detail.renderMethod))
      return history.length
    })

    await page.locator("#link-outside-frame-action-advance").evaluate((link) => link.click())
    await expectHistoryPage(page, destination, frameText)

    expect(await page.evaluate(() => ({
      bodyPreserved: document.body === window.replacePromotionBody,
      documentPreserved: document === window.replacePromotionDocument,
      historyLength: history.length,
      bodyMorphs: window.replaceBodyMorphs,
      renderMethods: window.replaceRenderMethods
    }))).toEqual({
      bodyPreserved: true,
      documentPreserved: true,
      historyLength,
      bodyMorphs: 0,
      renderMethods: [renderMethod]
    })
  })
}

test("an adapter that loads cached snapshots last does not notify before-cache on the visible page", async ({ page }) => {
  await page.locator("#link-outside-frame-action-advance").evaluate((link) => link.click())
  await expectHistoryPage(page, framePath, "Frame: Loaded")
  await page.goBack()
  await expectHistoryPage(page, sourcePath, "Frames: #frame")
  await expect.poll(() => cachedFrameText(page, framePath)).toEqual("Frame: Loaded")

  await page.evaluate(() => {
    const adapter = Object.create(window.Turbo.session.adapter)
    adapter.visitStarted = function (visit) {
      this.location = visit.location
      this.redirectedToLocation = null
      visit.issueRequest()
      visit.changeHistory()
      visit.loadCachedSnapshot()
    }
    window.Turbo.registerAdapter(adapter)
    window.adapterPromotionBody = document.body
    window.adapterBeforeCacheCount = 0
    window.frameHistoryPageLoads = []
    addEventListener("turbo:before-cache", () => {
      window.adapterBeforeCacheCount++
      document.querySelector("h1").textContent = "Changed by before-cache"
    })
  })

  await page.locator("#link-outside-frame-action-advance").evaluate((link) => link.click())
  await expectHistoryPage(page, framePath, "Frame: Loaded")

  expect(await page.evaluate(() => ({
    beforeCacheCount: window.adapterBeforeCacheCount,
    bodyPreserved: document.body === window.adapterPromotionBody
  }))).toEqual({ beforeCacheCount: 0, bodyPreserved: true })
})

function waitForPageLoad(page, path) {
  return page.waitForFunction((path) => {
    return window.frameHistoryPageLoads.at(-1) === new URL(path, location.href).href
  }, path)
}

async function expectHistoryPage(page, path, frameText) {
  await waitForPageLoad(page, path)
  await expect(page).toHaveURL(new URL(path, page.url()).href)
  await expect(page.locator("h1")).toHaveText("Original client state")
  await expect(page.locator("body")).toHaveAttribute("data-frame-history", "client")
  await expect(page.locator("#frame h2")).toHaveText(frameText)
  if (path === sourcePath) await expect(page.locator("#frame")).not.toHaveAttribute("src")
  expect(await page.evaluate(() => window.frameHistoryDocument === document)).toEqual(true)
}

function cachedFrameText(page, path) {
  return page.evaluate((path) => {
    const snapshot = window.Turbo.session.view.snapshotCache.get(new URL(path, location.href))
    return snapshot?.element.querySelector("#frame h2")?.textContent
  }, path)
}
