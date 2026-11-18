import { expect, test } from "@playwright/test"
import { nextEventNamed, readEventLogs, withPathname } from "../helpers/page"

const sourcePath = "/src/tests/fixtures/frame_promoted_visit.html"
const fullHeadPath = "/src/tests/fixtures/frames/promoted_full_head.html"

test.beforeEach(async ({ page }) => {
  await page.goto(sourcePath)
  await readEventLogs(page)
})

test("a promoted frame preserves head elements and attributes omitted from its response", async ({ page }) => {
  await page.evaluate(() => window.originalCsrfToken = document.querySelector('meta[name="csrf-token"]'))

  await promoteFrame(page, "#to-no-head")

  await expect(page).toHaveTitle("Promoted frame visits")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr")
  await expect(page.locator("meta[charset]")).toHaveAttribute("charset", "utf-8")
  await expect(page.locator('meta[name="csrf-token"]')).toHaveAttribute("content", "old-token")
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Description from the page")
  await expect(page.locator('meta[name="turbo-prefetch"]')).toHaveAttribute("content", "false")
  await expect(page.locator("base")).toHaveAttribute("href", "/src/tests/fixtures/")
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "/original-page")
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /Original/)
  await expect(page.locator('link[rel="icon"]')).toHaveCount(2)
  expect(await page.evaluate(() => document.querySelector('meta[name="csrf-token"]') === window.originalCsrfToken)).toBe(true)
})

test("a promoted frame may omit tracked assets without reloading the document", async ({ page }) => {
  await page.evaluate(() => {
    for (const script of document.querySelectorAll("script[src]")) {
      script.setAttribute("data-turbo-track", "reload")
    }
    window.originalDocument = document
    window.originalTurbo = window.Turbo
  })
  await page.route("**/src/tests/fixtures/frames/promoted_partial_head.html", async route => {
    const response = await route.fetch()
    const script = '<script src="/dist/turbo.es2017-umd.js" data-turbo-track="reload"></script>'
    const body = (await response.text()).replace("</head>", `${script}</head>`)
    await route.fulfill({ response, body })
  })

  await promoteFrame(page, "#to-partial-head")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/promoted_partial_head.html"))
  await expect(page).toHaveTitle("Promoted frame title")
  await expect(page.locator("h1")).toHaveText("Promoted frame visits")
  await expect(page.locator('script[src="/dist/turbo.es2017-umd.js"]')).toHaveCount(1)
  await expect(page.locator('script[src="/dist/turbo.es2017-umd.js"]')).toHaveAttribute("data-turbo-track", "reload")
  await expect(page.locator('script[src="/src/tests/fixtures/test.js"]')).toHaveCount(1)
  expect(await page.evaluate(() => window.originalDocument === document)).toBe(true)
  expect(await page.evaluate(() => window.originalTurbo === window.Turbo)).toBe(true)
  expect(await page.evaluate(() => window.Turbo.session.view.forceReloaded)).toBe(false)
})

test("a promoted frame replaces supplied metadata and sends the new CSRF token", async ({ page }) => {
  await promoteFrame(page, "#to-partial-head")

  await expect(page).toHaveTitle("Promoted frame title")
  await expect(page.locator("head title")).toHaveCount(1)
  await expect(page.locator('meta[name="csrf-token"]')).toHaveCount(1)
  await expect(page.locator('meta[name="csrf-token"]')).toHaveAttribute("content", "new-token")
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Description from the response")
  await expect(page.locator('meta[name="turbo-prefetch"]')).toHaveAttribute("content", "true")

  const submission = page.waitForRequest(request => request.method() === "POST" && new URL(request.url()).pathname === "/__turbo/redirect")
  await page.click("#submit-token")

  expect((await submission).headers()["x-csrf-token"]).toEqual("new-token")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
  await expect(page.locator("h1")).toHaveText("One")
})

test("a promoted frame replaces metadata groups in response order and preserves omitted variants", async ({ page }) => {
  await page.evaluate(() => {
    const token = document.querySelector('meta[name="csrf-token"]').cloneNode(true)
    token.content = "new-token"
    document.head.append(token)
    window.originalImageWidth = document.querySelector('meta[property="og:image:width"]')
  })
  await expect(page.locator('meta[name="csrf-token"]')).toHaveCount(2)

  await promoteFrame(page, "#to-partial-head")

  await expect(page.locator('meta[name="csrf-token"]')).toHaveCount(1)
  await expect(page.locator('meta[name="csrf-token"]')).toHaveAttribute("content", "new-token")
  expect(await page.locator('meta[property^="og:image"]').evaluateAll(elements => elements.map(element => [element.getAttribute("property"), element.content])))
    .toEqual([["og:image", "second-image"], ["og:image:width", "100"], ["og:image", "first-image"], ["og:image", "second-image"]])
  expect(await page.evaluate(() => document.querySelector('meta[property="og:image:width"]') === window.originalImageWidth)).toBe(true)
  await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')).toHaveAttribute("content", "dark-color")
  await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')).toHaveCount(1)
  await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')).toHaveAttribute("content", "new-light-color")
  await expect(page.locator('meta[http-equiv="content-language" i]')).toHaveCount(1)
  await expect(page.locator('meta[http-equiv="content-language" i]')).toHaveAttribute("content", "fr")
  await expect(page.locator('meta[itemprop="description"]')).toHaveCount(1)
  await expect(page.locator('meta[itemprop="description"]')).toHaveAttribute("content", "Updated item description")
})

test("a promoted frame applies a complete response head and keeps unchanged metadata nodes", async ({ page }) => {
  await page.evaluate(() => window.originalHeadElements = [
    ...document.querySelectorAll('meta[charset], meta[name="csrf-token"], meta[property="og:image"], link[rel="icon"]')
  ])

  await promoteFrame(page, "#to-full-head")

  expect(await page.evaluate(() => {
    const elements = [...document.querySelectorAll('meta[charset], meta[name="csrf-token"], meta[property="og:image"], link[rel="icon"]')]
    return elements.length === window.originalHeadElements.length && elements.every((element, index) => element === window.originalHeadElements[index])
  })).toBe(true)

  await expect(page).toHaveTitle("Complete promoted frame title")
  await expect(page.locator("html")).toHaveAttribute("lang", "fr")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.locator("h1")).toHaveText("Promoted frame visits")
  await expect(page.locator("#promoted h2")).toHaveText("Frame: Full head")
})

test("a promoted frame applies explicitly empty language and direction", async ({ page }) => {
  await page.route(`**${fullHeadPath}`, async route => {
    const response = await route.fetch()
    const body = (await response.text()).replace('lang="fr" dir="rtl"', 'lang="" dir=""')
    await route.fulfill({ response, body })
  })

  await promoteFrame(page, "#to-full-head")

  await expect(page.locator("html")).toHaveAttribute("lang", "")
  await expect(page.locator("html")).toHaveAttribute("dir", "")
})

test("a promoted frame replaces supplied base and link groups without removing other icons", async ({ page }) => {
  await promoteFrame(page, "#to-partial-head")

  await expect(page.locator("base")).toHaveCount(1)
  await expect(page.locator("base")).toHaveAttribute("href", "/src/tests/fixtures/frames/")
  expect(await page.evaluate(() => new URL(document.baseURI).pathname)).toEqual("/src/tests/fixtures/frames/")
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "/promoted-page")
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1)
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /Promoted/)
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveCount(1)
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute("href", /#old-32$/)
  expect(await page.locator('link[rel~="icon"][sizes="16x16"]').evaluateAll(elements => elements.map(element => new URL(element.href).hash)))
    .toEqual(["#new-16-first", "#new-16-second"])
})

test("a promoted frame reloads before activating a changed tracked asset", async ({ page }) => {
  await page.evaluate(() => {
    const script = document.createElement("script")
    script.setAttribute("data-turbo-track", "reload")
    script.textContent = 'window.headAssetVersions = ["v1"]'
    document.head.append(script)
    sessionStorage.removeItem("headAssetDocuments")
  })
  expect(await page.evaluate(() => window.headAssetVersions)).toEqual(["v1"])
  await page.route(`**${fullHeadPath}`, async route => {
    const response = await route.fetch()
    const script = `<script data-turbo-track="reload">
      window.headAssetVersions = [...(window.headAssetVersions || []), "v2"]
      const documents = JSON.parse(sessionStorage.getItem("headAssetDocuments") || "[]")
      documents.push(document.documentElement.dataset.headPage)
      sessionStorage.setItem("headAssetDocuments", JSON.stringify(documents))
    </script>`
    const body = (await response.text()).replace("</head>", `${script}</head>`)
    await route.fulfill({ response, body })
  })

  const reload = page.waitForRequest(request => request.isNavigationRequest() && new URL(request.url()).pathname === fullHeadPath)
  await page.click("#to-full-head")
  await reload

  await expect(page.locator("h1")).toHaveText("Complete promoted frame page")
  expect(await page.evaluate(() => window.headAssetVersions)).toEqual(["v2"])
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("headAssetDocuments")))).toEqual(["destination"])
})

test("an ordinary Drive visit still removes omitted metadata and empty document attributes", async ({ page }) => {
  await page.route("**/src/tests/fixtures/frame_promoted_destination.html", async route => {
    const response = await route.fetch()
    const body = (await response.text()).replace("<html>", '<html lang="" dir="">')
    await route.fulfill({ response, body })
  })
  await page.evaluate(() => window.originalDocument = document)
  await page.click("#drive-away")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Promoted frame destination")
  await expect(page.locator("html")).not.toHaveAttribute("lang")
  await expect(page.locator("html")).not.toHaveAttribute("dir")
  await expect(page.locator('meta[name="csrf-token"]')).not.toBeAttached()
  await expect(page.locator('meta[name="description"]')).not.toBeAttached()
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0)
  await expect(page.locator("base")).not.toBeAttached()
  expect(await page.evaluate(() => window.originalDocument === document)).toBe(true)
})

async function promoteFrame(page, selector) {
  await page.click(selector)
  await nextEventNamed(page, "turbo:load")
}
