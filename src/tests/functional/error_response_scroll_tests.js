import { expect, test } from "@playwright/test"
import { clickWithoutScrolling } from "../helpers/page"

for (const status of [404, 500]) {
  test(`a link to an HTTP ${status} response scrolls to the top`, async ({ page }) => {
    await startScrolledVisit(page, status)
    await errorResponseRendered(page, status, () => clickWithoutScrolling(page, "#error-link"))

    expect(await scrollPosition(page)).toEqual({ x: 0, y: 0 })
  })
}

test("a link to an HTTP 404 response scrolls to its fragment", async ({ page }) => {
  await startScrolledVisit(page, 404)
  await errorResponseRendered(page, 404, () => clickWithoutScrolling(page, "#anchor-link"))

  expect(new URL(page.url()).hash).toEqual("#error-message")
  expect(await scrollPosition(page)).toEqual({ x: 0, y: 1200 })
})

for (const scroll of ["reset", "preserve"]) {
  test(`a same-URL HTTP 500 refresh respects scroll=${scroll}`, async ({ page }) => {
    await startScrolledVisit(page, 500, scroll)
    const originalURL = page.url()
    await errorResponseRendered(page, 500, () => page.evaluate(() => window.Turbo.visit(location.href, { action: "replace" })))

    expect(page.url()).toEqual(originalURL)
    expect(await scrollPosition(page)).toEqual(scroll === "preserve" ? { x: 120, y: 600 } : { x: 0, y: 0 })
  })
}

async function startScrolledVisit(page, status, scroll = "reset") {
  await page.goto(`/__turbo/error_scroll/${status}/${scroll}`)
  await page.evaluate(() => {
    window.scrollTo(120, 600)
    window.errorVisitCompleted = false
    addEventListener("turbo:load", () => window.errorVisitCompleted = true, { once: true })
  })
  expect(await scrollPosition(page)).toEqual({ x: 120, y: 600 })
}

async function errorResponseRendered(page, status, navigate) {
  const response = page.waitForResponse((response) =>
    response.request().resourceType() === "fetch" && new URL(response.url()).pathname.includes("/error_scroll/")
  )
  await navigate()
  expect((await response).status()).toEqual(status)
  await page.waitForFunction(() => window.errorVisitCompleted)
  await expect(page.locator("h1")).toHaveText("Error response")
  expect(await page.locator("body").evaluate((body) => body.scrollHeight)).toBeGreaterThan(3000)
}

function scrollPosition(page) {
  return page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
}
