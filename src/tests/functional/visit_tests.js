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

test("test programmatically visiting a same-origin location", async ({ page }) => {
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

  const urlAfterVisit = page.url()
  assert.notEqual(urlBeforeVisit, urlAfterVisit)
  assert.equal(await visitAction(page), "load")
})

test("test visiting a location served with a non-HTML content type", async ({ page }) => {
  const urlBeforeVisit = page.url()
  await visitLocation(page, "/src/tests/fixtures/svg.svg")
  await nextBeat()

  const url = page.url()
  const contentType = await contentTypeOfURL(url)
  assert.equal(contentType, "image/svg+xml")

  const urlAfterVisit = page.url()
  assert.notEqual(urlBeforeVisit, urlAfterVisit)
  assert.equal(await visitAction(page), "load")
})

test("test canceling a turbo:click event falls back to built-in browser navigation", async ({ page }) => {
  await cancelNextEvent(page, "turbo:click")
  await Promise.all([page.waitForNavigation(), page.click("#same-origin-link")])

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
})

test("test canceling a before-visit event prevents navigation", async ({ page }) => {
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

test("test navigation by history is not cancelable", async ({ page }) => {
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "One")

  await cancelNextVisit(page)
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "Visit")
})

test("test turbo:before-fetch-request event.detail", async ({ page }) => {
  await page.click("#same-origin-link")
  const { url, fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.equal(fetchOptions.method, "get")
  assert.ok(url.includes("/src/tests/fixtures/one.html"))
})

test("test turbo:before-fetch-request event.detail encodes searchParams", async ({ page }) => {
  await page.click("#same-origin-link-search-params")
  const { url } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(url.includes("/src/tests/fixtures/one.html?key=value"))
})

test("test turbo:before-fetch-response open new site", async ({ page }) => {
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

test("test visits with data-turbo-stream include MIME type & search params", async ({ page }) => {
  await page.click("#stream-link")
  const { fetchOptions, url } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
  assert.equal(getSearchParam(url, "key"), "value")
})

test("test visits with data-turbo-stream do not set aria-busy", async ({ page }) => {
  await page.click("#stream-link")

  assert.ok(
    await noNextAttributeMutationNamed(page, "html", "aria-busy"),
    "never sets [aria-busy] on the document element"
  )
})

test("test cache does not override response after redirect", async ({ page }) => {
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

function cancelNextVisit(page) {
  return cancelNextEvent(page, "turbo:before-visit")
}

function contentTypeOfURL(url) {
  return new Promise((resolve) => {
    get(url, ({ headers }) => resolve(headers["content-type"]))
  })
}

test("test can scroll to element after click-initiated turbo:visit", async ({ page }) => {
  const id = "below-the-fold-link"
  await page.evaluate((id) => {
    addEventListener("turbo:load", () => document.getElementById(id)?.scrollIntoView())
  }, id)

  assert(await isScrolledToTop(page), "starts unscrolled")

  await page.click("#same-page-link")
  await nextEventNamed(page, "turbo:load")

  assert(await isScrolledToSelector(page, "#" + id), "scrolls after click-initiated turbo:load")
})

test("test can scroll to element after history-initiated turbo:visit", async ({ page }) => {
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

test("test Visit with network error", async ({ page }) => {
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
  await page.reload()
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
