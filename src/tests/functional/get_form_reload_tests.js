import { expect, test } from "@playwright/test"
import { nextEventNamed, readEventLogs } from "../helpers/page"

const sourcePath = "/src/tests/fixtures/get_form_reload.html"
const responsePath = "/__turbo/get-form-reload-error"

test.beforeEach(async ({ page }) => {
  await page.goto(sourcePath)
  await page.evaluate(() => {
    window.originalGetFormDocument = document
    sessionStorage.removeItem("getFormReloadDocuments")
    sessionStorage.removeItem("changedTrackedAssetActivated")
  })
  await readEventLogs(page)
})

for (const { redirected, previousVisit } of [
  { redirected: false, previousVisit: false },
  { redirected: true, previousVisit: false },
  { redirected: false, previousVisit: true }
]) {
  test(`a failed GET form reloads the ${redirected ? "redirected" : "direct"} response URL when tracked assets change${previousVisit ? " after a Drive visit" : ""}`, async ({ page }) => {
    const navigations = recordDocumentRequests(page)
    if (previousVisit) {
      await page.evaluate(path => {
        window.Turbo.visit(`/__turbo/redirect?path=${encodeURIComponent(path)}&previous=true`)
      }, sourcePath)
      await nextEventNamed(page, "turbo:load")
      await expect(page).toHaveURL(url => url.pathname === sourcePath && url.searchParams.get("previous") === "true")
    }
    if (redirected) {
      await page.locator("#get-form").evaluate(form => {
        form.action = "/__turbo/redirect"
        form.elements.namedItem("path").disabled = false
      })
    }

    await Promise.all([page.waitForEvent("load"), page.click("#get-submit")])

    const destination = new URL(page.url())
    expect(destination.pathname).toEqual(responsePath)
    expect(destination.searchParams.get("query")).toEqual("invalid")
    await expect(page.locator("h1")).toHaveText("GET form error")
    await expect(page).toHaveTitle("GET form error")
    expect(navigations).toEqual([{ method: "GET", url: page.url() }])
    expect(await page.evaluate(() => document === window.originalGetFormDocument)).toBe(false)
    expect(await page.evaluate(() => window.formReloadVersion)).toEqual("destination")
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("getFormReloadDocuments")))).toEqual(["destination"])
  })
}

test("a failed GET form reloads its response URL when visit-control requests a reload", async ({ page }) => {
  const navigations = recordDocumentRequests(page)
  await page.locator("#get-form").evaluate(form => {
    form.elements.namedItem("compatible").disabled = false
    form.elements.namedItem("reload").disabled = false
    addEventListener("turbo:reload", ({ detail }) => sessionStorage.setItem("getFormReloadReason", detail.reason), { once: true })
  })

  await Promise.all([page.waitForEvent("load"), page.click("#get-submit")])

  expect(new URL(page.url()).pathname).toEqual(responsePath)
  expect(new URL(page.url()).searchParams.get("query")).toEqual("invalid")
  await expect(page.locator("h1")).toHaveText("GET form error")
  expect(navigations).toEqual([{ method: "GET", url: page.url() }])
  expect(await page.evaluate(() => document === window.originalGetFormDocument)).toBe(false)
  expect(await page.evaluate(() => window.formReloadVersion)).toEqual("source")
  expect(await page.evaluate(() => sessionStorage.getItem("getFormReloadReason"))).toEqual("turbo_visit_control_is_reload")
})

test("a compatible GET error does not change the reload destination of a later failed POST", async ({ page }) => {
  const sourceURL = page.url()
  const navigations = recordDocumentRequests(page)
  const submissions = []
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/__turbo/reject/tracked-assets") submissions.push(request.method())
  })
  await page.locator("#get-form").evaluate(form => {
    form.elements.namedItem("compatible").disabled = false
  })

  await page.click("#get-submit")
  await nextEventNamed(page, "turbo:submit-end")

  await expect(page.locator("h1")).toHaveText("GET form error")
  await expect(page).toHaveURL(sourceURL)
  expect(navigations).toEqual([])
  expect(await page.evaluate(() => document === window.originalGetFormDocument)).toBe(true)

  await Promise.all([page.waitForEvent("load"), page.click("#post-submit")])

  await expect(page).toHaveURL(sourceURL)
  await expect(page.locator("h1")).toHaveText("GET form source")
  expect(navigations).toEqual([{ method: "GET", url: sourceURL }])
  expect(submissions).toEqual(["POST"])
  expect(await page.evaluate(() => sessionStorage.getItem("changedTrackedAssetActivated"))).toBeNull()
})

function recordDocumentRequests(page) {
  const requests = []
  page.on("request", request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      requests.push({ method: request.method(), url: request.url() })
    }
  })
  return requests
}
