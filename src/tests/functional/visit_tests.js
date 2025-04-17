import { test } from "@playwright/test"
import { assert } from "chai"
import { get } from "http"
import {
  cancelNextEvent,
  getSearchParam,
  isScrolledToSelector,
  isScrolledToTop,
  nextAttributeMutationNamed,
  nextBeat,
  nextBody,
  nextEventNamed,
  noNextAttributeMutationNamed,
  pathname,
  readEventLogs,
  resetMutationLogs,
  scrollToSelector,
  visitAction,
  waitUntilNoSelector,
  willChangeBody
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/visit.html")
  await readEventLogs(page)
})

test("programmatically visiting a same-origin location", async ({ page }) => {
  const urlBeforeVisit = page.url()
  await visitLocation(page, "/src/tests/fixtures/one.html")

  await nextBeat()

  const urlAfterVisit = page.url()
  assert.notEqual(urlBeforeVisit, urlAfterVisit)
  assert.equal(await visitAction(page), "advance")

  const { url: urlFromBeforeVisitEvent } = await nextEventNamed(page, "turbo:before-visit")
  assert.equal(urlFromBeforeVisitEvent, urlAfterVisit)

  const { url: urlFromVisitEvent } = await nextEventNamed(page, "turbo:visit")
  assert.equal(urlFromVisitEvent, urlAfterVisit)

  const { timing } = await nextEventNamed(page, "turbo:load")
  assert.ok(timing)
})

test("skip programmatically visiting a cross-origin location falls back to window.location", async ({ page }) => {
  const urlBeforeVisit = page.url()
  await visitLocation(page, "about:blank")
  await nextBeat()

  const urlAfterVisit = page.url()
  assert.notEqual(urlBeforeVisit, urlAfterVisit)
  assert.equal(await visitAction(page), "load")
})

test("visiting a location served with a known non-HTML content type", async ({ page }) => {
  const requestedUrls = []
  page.on('request', (req) => { requestedUrls.push([req.resourceType(), req.url()]) })

  const urlBeforeVisit = page.url()
  await visitLocation(page, "/src/tests/fixtures/svg.svg")
  await nextBeat()

  const url = page.url()
  const contentType = await contentTypeOfURL(url)
  assert.equal(contentType, "image/svg+xml")

  assert.deepEqual(requestedUrls, [
    ["document", "http://localhost:9000/src/tests/fixtures/svg.svg"]
  ])

  const urlAfterVisit = page.url()
  assert.notEqual(urlBeforeVisit, urlAfterVisit)
  assert.equal(await visitAction(page), "load")
})

test("visiting a location served with an unknown non-HTML content type", async ({ page }) => {
  const requestedUrls = []
  page.on('request', (req) => { requestedUrls.push([req.resourceType(), req.url()]) })

  const urlBeforeVisit = page.url()
  await visitLocation(page, "/__turbo/file.unknown_svg")
  await nextBeat()

  // Because the file extension is not a known extension, Turbo will request it first to
  // determine the content type and only then refresh the full page to the provided location
  assert.deepEqual(requestedUrls, [
    ["fetch", "http://localhost:9000/__turbo/file.unknown_svg"],
    ["document", "http://localhost:9000/__turbo/file.unknown_svg"]
  ])

  const urlAfterVisit = page.url()
  assert.notEqual(urlBeforeVisit, urlAfterVisit)
  assert.equal(await visitAction(page), "load")
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

assert.deepEqual(requestedUrls, [
  ["document", "http://localhost:9000/__turbo/file.unknown_svg"]
])

  const urlAfterVisit = page.url()
  assert.notEqual(urlBeforeVisit, urlAfterVisit)
  assert.equal(await visitAction(page), "load")
})

test("visiting a location with a non-HTML extension", async ({ page }) => {
  await visitLocation(page, "/__turbo/file.unknown_html")
  await nextBeat()

  assert.equal(await visitAction(page), "advance")
})

test("refreshing a location with a non-HTML extension", async ({ page }) => {
  await page.goto("/__turbo/file.unknown_html")
  const urlBeforeVisit = page.url()

  await visitLocation(page, "/__turbo/file.unknown_html")
  await nextBeat()

  const urlAfterVisit = page.url()
  assert.equal(urlBeforeVisit, urlAfterVisit)
  assert.equal(await visitAction(page), "advance")
})

test("canceling a turbo:click event falls back to built-in browser navigation", async ({ page }) => {
  await cancelNextEvent(page, "turbo:click")
  await Promise.all([page.waitForNavigation(), page.click("#same-origin-link")])

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
})

test("canceling a before-visit event prevents navigation", async ({ page }) => {
  await cancelNextVisit(page)
  const urlBeforeVisit = page.url()

  assert.notOk(
    await willChangeBody(page, async () => {
      await page.click("#same-origin-link")
      await nextBeat()
    })
  )

  const urlAfterVisit = page.url()
  assert.equal(urlAfterVisit, urlBeforeVisit)
})

test("navigation by history is not cancelable", async ({ page }) => {
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "One")

  await cancelNextVisit(page)
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "Visit")
})

test("turbo:before-fetch-request event.detail", async ({ page }) => {
  await page.click("#same-origin-link")
  const { url, fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.equal(fetchOptions.method, "GET")
  assert.ok(url.includes("/src/tests/fixtures/one.html"))
})

test("turbo:before-fetch-request event.detail encodes searchParams", async ({ page }) => {
  await page.click("#same-origin-link-search-params")
  const { url } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(url.includes("/src/tests/fixtures/one.html?key=value"))
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

  assert.isTrue(fetchResponseResult.responseText.indexOf("An element with an ID") > -1)
  assert.isTrue(fetchResponseResult.responseHTML.indexOf("An element with an ID") > -1)
})

test("visits with data-turbo-stream include MIME type & search params", async ({ page }) => {
  await page.click("#stream-link")
  const { fetchOptions, url } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
  assert.equal(getSearchParam(url, "key"), "value")
})

test("visits with data-turbo-stream do not set aria-busy", async ({ page }) => {
  await page.click("#stream-link")

  assert.ok(
    await noNextAttributeMutationNamed(page, "html", "aria-busy"),
    "never sets [aria-busy] on the document element"
  )
})

test("cache does not override response after redirect", async ({ page }) => {
  await page.evaluate(() => {
    const cachedElement = document.createElement("some-cached-element")
    document.body.appendChild(cachedElement)
  })

  assert.equal(await page.locator("some-cached-element").count(), 1)

  await page.click("#same-origin-link")
  await nextBeat()
  await page.click("#redirection-link")
  await nextBeat() // 301 redirect response
  await nextBeat() // 200 response

  assert.equal(await page.locator("some-cached-element").count(), 0)
})

test("cache does not hide temporary elements on the second visit after redirect", async ({ page }) => {
  await page.click("#cache-observer-link")
  await nextBeat()
  await page.click("#redirect-here-link")
  await nextBeat() // 301 redirect response
  await nextBeat() // 200 response

  assert.equal(await page.locator("#temporary").count(), 1)

  await page.click("#redirect-here-link")
  await nextBeat() // 301 redirect response
  await nextBeat() // 200 response

  assert.equal(await page.locator("#temporary").count(), 1)
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

  assert(await isScrolledToTop(page), "starts unscrolled")

  await page.click("#same-page-link")
  await nextEventNamed(page, "turbo:load")

  assert(await isScrolledToSelector(page, "#" + id), "scrolls after click-initiated turbo:load")
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

  assert(await isScrolledToSelector(page, "#" + id), "scrolls after history-initiated turbo:load")
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
  await Promise.all([
    nextBody(page),
    page.evaluate(() => window.location.reload())
  ])
  assert.equal(
    await page.evaluate(() => window.history.state.turbo.restorationIndex),
    1,
    "restorationIndex is persisted between reloads"
  )
})

async function visitLocation(page, location) {
  return page.evaluate((location) => window.Turbo.visit(location), location)
}

async function assertVisitDirectionAttribute(page, direction) {
  assert.equal(await nextAttributeMutationNamed(page, "html", "data-turbo-visit-direction"), direction)
  await waitUntilNoSelector(page, "[data-turbo-visit-direction]")
}
