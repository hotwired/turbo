import { expect, test } from "@playwright/test"
import { get } from "http"
import {
  cancelNextEvent,
  getSearchParam,
  isScrolledToSelector,
  isScrolledToTop,
  nextAttributeMutationNamed,
  nextBeat,
  nextEventNamed,
  noNextAttributeMutationNamed,
  readEventLogs,
  reloadPage,
  resetMutationLogs,
  scrollToSelector,
  visitAction,
  willChangeBody,
  withPathname
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/visit.html")
  await readEventLogs(page)
})

test("programmatically visiting a same-origin location", async ({ page }) => {
  const urlBeforeVisit = page.url()
  await visitLocation(page, "/src/tests/fixtures/one.html")

  await expect(page).not.toHaveURL(urlBeforeVisit)
  expect(await visitAction(page)).toEqual("advance")

  const { url: urlFromBeforeVisitEvent } = await nextEventNamed(page, "turbo:before-visit")
  await expect(page).not.toHaveURL(withPathname(urlFromBeforeVisitEvent))

  const { url: urlFromVisitEvent } = await nextEventNamed(page, "turbo:visit")
  await expect(page).not.toHaveURL(withPathname(urlFromVisitEvent))

  const { timing } = await nextEventNamed(page, "turbo:load")
  expect(timing).toBeTruthy()
})

test("skip programmatically visiting a cross-origin location falls back to window.location", async ({ page }) => {
  const urlBeforeVisit = page.url()
  await visitLocation(page, "about:blank")
  await nextBeat()

  await expect(page).not.toHaveURL(urlBeforeVisit)
  expect(await visitAction(page)).toEqual("load")
})

test("visiting a location served with a known non-HTML content type", async ({ page }) => {
  const requestedUrls = []
  page.on('request', (req) => { requestedUrls.push([req.resourceType(), req.url()]) })

  const urlBeforeVisit = page.url()
  await visitLocation(page, "/src/tests/fixtures/svg.svg")
  await nextBeat()

  const url = page.url()
  const contentType = await contentTypeOfURL(url)
  expect(contentType).toEqual("image/svg+xml")

  expect(requestedUrls).toEqual([
    ["document", "http://localhost:9000/src/tests/fixtures/svg.svg"]
  ])

  await expect(page).not.toHaveURL(urlBeforeVisit)
  expect(await visitAction(page)).toEqual("load")
})

test("visiting a location served with an unknown non-HTML content type", async ({ page }) => {
  const requestedUrls = []
  page.on('request', (req) => { requestedUrls.push([req.resourceType(), req.url()]) })

  const urlBeforeVisit = page.url()
  await visitLocation(page, "/__turbo/file.unknown_svg")
  await nextBeat()

  // Because the file extension is not a known extension, Turbo will request it first to
  // determine the content type and only then refresh the full page to the provided location
  expect(requestedUrls).toEqual([
    ["fetch", "http://localhost:9000/__turbo/file.unknown_svg"],
    ["document", "http://localhost:9000/__turbo/file.unknown_svg"]
  ])

  await expect(page).not.toHaveURL(urlBeforeVisit)
  expect(await visitAction(page)).toEqual("load")
})

test("visiting a location served with an unknown non-HTML content type added to the unvisitableExtensions set", async ({ page }) => {
  const requestedUrls = []
  page.on('request', (req) => { requestedUrls.push([req.resourceType(), req.url()]) })

  page.evaluate(() => {
    window.Turbo.config.drive.unvisitableExtensions.add(".unknown_svg")
  })

  const urlBeforeVisit = page.url()
  await visitLocation(page, "/__turbo/file.unknown_svg")
  await nextBeat()

  expect(requestedUrls).toEqual([
    ["document", "http://localhost:9000/__turbo/file.unknown_svg"]
  ])

  await expect(page).not.toHaveURL(urlBeforeVisit)
  expect(await visitAction(page)).toEqual("load")
})

test("visiting a location with a non-HTML extension", async ({ page }) => {
  await visitLocation(page, "/__turbo/file.unknown_html")
  await nextBeat()

  expect(await visitAction(page)).toEqual("advance")
})

test("refreshing a location with a non-HTML extension", async ({ page }) => {
  await page.goto("/__turbo/file.unknown_html")
  const urlBeforeVisit = page.url()

  await visitLocation(page, "/__turbo/file.unknown_html")
  await nextBeat()

  await expect(page).toHaveURL(urlBeforeVisit)
  expect(await visitAction(page)).toEqual("advance")
})

test("canceling a turbo:click event falls back to built-in browser navigation", async ({ page }) => {
  await cancelNextEvent(page, "turbo:click")
  await Promise.all([page.waitForNavigation(), page.click("#same-origin-link")])

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
})

test("canceling a before-visit event prevents navigation", async ({ page }) => {
  await cancelNextVisit(page)
  const urlBeforeVisit = page.url()

  expect(
    await willChangeBody(page, async () => {
      await page.click("#same-origin-link")
      await nextBeat()
    })
  ).not.toBeTruthy()

  await expect(page).toHaveURL(urlBeforeVisit)
})

test("navigation by history is not cancelable", async ({ page }) => {
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("One")

  await cancelNextVisit(page)
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Visit")
})

test("turbo:before-fetch-request event.detail", async ({ page }) => {
  await page.click("#same-origin-link")
  const { url, fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.method).toEqual("GET")
  expect(url).toContain("/src/tests/fixtures/one.html")
})

test("turbo:before-fetch-request event.detail encodes searchParams", async ({ page }) => {
  await page.click("#same-origin-link-search-params")
  const { url } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(url).toContain("/src/tests/fixtures/one.html?key=value")
})

test("turbo:before-fetch-response open new site", async ({ page }) => {
  page.evaluate(() =>
    addEventListener(
      "turbo:before-fetch-response",
      async function eventListener(event) {
        removeEventListener("turbo:before-fetch-response", eventListener, false)
        window.fetchResponseResult = {
          responseText: await event.detail.fetchResponse.responseText,
          responseHTML: await event.detail.fetchResponse.responseHTML
        }
      },
      false
    )
  )

  await page.click("#sample-response")
  await nextEventNamed(page, "turbo:before-fetch-response")

  const fetchResponseResult = await page.evaluate(() => window.fetchResponseResult)

  expect(fetchResponseResult.responseText.indexOf("An element with an ID")).toBeGreaterThan(-1)
  expect(fetchResponseResult.responseHTML.indexOf("An element with an ID")).toBeGreaterThan(-1)
})

test("visits with data-turbo-stream include MIME type & search params", async ({ page }) => {
  await page.click("#stream-link")
  const { fetchOptions, url } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).toContain("text/vnd.turbo-stream.html")
  expect(getSearchParam(url, "key")).toEqual("value")
})

test("visits with data-turbo-stream do not set aria-busy", async ({ page }) => {
  await page.click("#stream-link")

  expect(
    await noNextAttributeMutationNamed(page, "html", "aria-busy"),
    "never sets [aria-busy] on the document element"
  ).toBeTruthy()
})

test("cache does not override response after redirect", async ({ page }) => {
  await page.evaluate(() => {
    const cachedElement = document.createElement("some-cached-element")
    document.body.appendChild(cachedElement)
  })

  await expect(page.locator("some-cached-element")).toHaveCount(1)

  await page.click("#same-origin-link")
  await nextBeat()
  await page.click("#redirection-link")

  await expect(page.locator("some-cached-element")).toHaveCount(0)
})

test("cache does not hide temporary elements on the second visit after redirect", async ({ page }) => {
  await page.click("#cache-observer-link")
  await nextBeat()
  await page.click("#redirect-here-link")
  await nextBeat() // 301 redirect response
  await nextBeat() // 200 response

  await expect(page.locator("#temporary")).toHaveCount(1)

  await page.click("#redirect-here-link")
  await nextBeat() // 301 redirect response
  await nextBeat() // 200 response

  await expect(page.locator("#temporary")).toHaveCount(1)
})

function cancelNextVisit(page) {
  return cancelNextEvent(page, "turbo:before-visit")
}

function contentTypeOfURL(url) {
  return new Promise((resolve) => {
    get(url, ({ headers }) => resolve(headers["content-type"]))
  })
}

test("can scroll to element after click-initiated turbo:visit", async ({ page }) => {
  const id = "below-the-fold-link"
  await page.evaluate((id) => {
    addEventListener("turbo:load", () => document.getElementById(id)?.scrollIntoView())
  }, id)

  expect(await isScrolledToTop(page), "starts unscrolled").toBeTruthy()

  await page.click("#same-page-link")
  await nextEventNamed(page, "turbo:load")

  expect(await isScrolledToSelector(page, "#" + id), "scrolls after click-initiated turbo:load").toBeTruthy()
})

test("can scroll to element after history-initiated turbo:visit", async ({ page }) => {
  const id = "below-the-fold-link"
  await page.evaluate((id) => {
    addEventListener("turbo:load", () => document.getElementById(id)?.scrollIntoView())
  }, id)

  await scrollToSelector(page, "#" + id)
  await page.click("#" + id)
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  expect(await isScrolledToSelector(page, "#" + id), "scrolls after history-initiated turbo:load").toBeTruthy()
})

test("Visit with network error", async ({ page }) => {
  await page.evaluate(() => {
    addEventListener("turbo:fetch-request-error", (event) => event.preventDefault())
  })
  await page.context().setOffline(true)
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:fetch-request-error")
})

test("Visit direction data attribute when clicking a link", async ({ page }) => {
  page.click("#same-origin-link")
  await assertVisitDirectionAttribute(page, "forward")
})

test("Visit direction data attribute when navigating back", async ({ page }) => {
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")

  await resetMutationLogs(page)

  page.goBack()

  await assertVisitDirectionAttribute(page, "back")
})

test("Visit direction attribute when navigating forward", async ({ page }) => {
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  page.goForward()

  await assertVisitDirectionAttribute(page, "forward")
})

test("Visit direction attribute on a replace visit", async ({ page }) => {
  page.click("#same-origin-replace-link")

  await assertVisitDirectionAttribute(page, "none")
})

test("Turbo history state after a reload", async ({ page }) => {
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")
  await reloadPage(page)
  expect(
    await page.evaluate(() => window.history.state.turbo.restorationIndex),
    "restorationIndex is persisted between reloads"
  ).toEqual(
    1
  )
})

async function visitLocation(page, location) {
  return page.evaluate((location) => window.Turbo.visit(location), location)
}

async function assertVisitDirectionAttribute(page, direction) {
  expect(await nextAttributeMutationNamed(page, "html", "data-turbo-visit-direction")).toEqual(direction)
  await expect(page.locator("[data-turbo-visit-direction]")).not.toBeAttached()
}
