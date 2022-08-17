import { Page, test } from "@playwright/test"
import { assert } from "chai"
import { get } from "http"
import {
  getSearchParam,
  isScrolledToSelector,
  isScrolledToTop,
  nextBeat,
  nextEventNamed,
  noNextAttributeMutationNamed,
  readEventLogs,
  scrollToSelector,
  visitAction,
  willChangeBody,
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

test("test programmatically Turbo.visit-ing a same-origin location", async ({ page }) => {
  const urlBeforeVisit = page.url()
  await page.evaluate(async () => await window.Turbo.visit("/src/tests/fixtures/one.html"))

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

test("skip programmatically Turbo.visit-ing a cross-origin location falls back to window.location", async ({
  page,
}) => {
  const urlBeforeVisit = page.url()
  await page.evaluate(async () => await window.Turbo.visit("about:blank"))

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

test("test canceling a before-visit event prevents navigation", async ({ page }) => {
  await cancelNextVisit(page)
  const urlBeforeVisit = page.url()

  assert.notOk<boolean>(
    await willChangeBody(page, async () => {
      await page.click("#same-origin-link")
      await nextBeat()
    })
  )

  const urlAfterVisit = page.url()
  assert.equal(urlAfterVisit, urlBeforeVisit)
})

test("test canceling a before-visit event prevents a Turbo.visit-initiated navigation", async ({ page }) => {
  await cancelNextVisit(page)
  const urlBeforeVisit = page.url()

  assert.notOk<boolean>(
    await willChangeBody(page, async () => {
      await page.evaluate(async () => {
        try {
          return await window.Turbo.visit("/src/tests/fixtures/one.html")
        } catch {
          const title = document.querySelector("h1")
          if (title) title.innerHTML = "Visit canceled"
        }
      })
    })
  )

  const urlAfterVisit = page.url()
  assert.equal(urlAfterVisit, urlBeforeVisit)
  assert.equal(await page.textContent("h1"), "Visit canceled")
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

  assert.equal(fetchOptions.method, "GET")
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
      async function eventListener(event: any) {
        removeEventListener("turbo:before-fetch-response", eventListener, false)
        ;(window as any).fetchResponseResult = {
          responseText: await event.detail.fetchResponse.responseText,
          responseHTML: await event.detail.fetchResponse.responseHTML,
        }
      },
      false
    )
  )

  await page.click("#sample-response")
  await nextEventNamed(page, "turbo:before-fetch-response")

  const fetchResponseResult = await page.evaluate(() => (window as any).fetchResponseResult)

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

function cancelNextVisit(page: Page): Promise<void> {
  return page.evaluate(() => addEventListener("turbo:before-visit", (event) => event.preventDefault(), { once: true }))
}

function contentTypeOfURL(url: string): Promise<string | undefined> {
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

async function visitLocation(page: Page, location: string) {
  return page.evaluate((location) => window.Turbo.visit(location), location)
}
