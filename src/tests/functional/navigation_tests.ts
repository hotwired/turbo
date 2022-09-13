import { test } from "@playwright/test"
import { assert } from "chai"
import {
  clickWithoutScrolling,
  hash,
  hasSelector,
  isScrolledToSelector,
  nextAttributeMutationNamed,
  nextBeat,
  nextBody,
  nextEventNamed,
  noNextEventNamed,
  nextEventOnTarget,
  pathname,
  readEventLogs,
  search,
  selectorHasFocus,
  visitAction,
  waitUntilSelector,
  waitUntilNoSelector,
  willChangeBody,
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/navigation.html")
  await readEventLogs(page)
})

test("test navigating renders a progress bar", async ({ page }) => {
  assert.equal(
    await page.locator("style").evaluate((style) => style.nonce),
    "123",
    "renders progress bar stylesheet inline with nonce"
  )

  await page.evaluate(() => window.Turbo.setProgressBarDelay(0))
  await page.click("#delayed-link")

  await waitUntilSelector(page, ".turbo-progress-bar")
  assert.ok(await hasSelector(page, ".turbo-progress-bar"), "displays progress bar")

  await nextEventNamed(page, "turbo:load")
  await waitUntilNoSelector(page, ".turbo-progress-bar")

  assert.notOk(await hasSelector(page, ".turbo-progress-bar"), "hides progress bar")
})

test("test navigating does not render a progress bar before expiring the delay", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setProgressBarDelay(1000))
  await page.click("#same-origin-unannotated-link")

  assert.notOk(await hasSelector(page, ".turbo-progress-bar"), "does not show progress bar before delay")
})

test("test after loading the page", async ({ page }) => {
  assert.equal(pathname(page.url()), "/src/tests/fixtures/navigation.html")
  assert.equal(await visitAction(page), "load")
})

test("test following a same-origin unannotated link", async ({ page }) => {
  page.click("#same-origin-unannotated-link")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "advance")
  assert.equal(
    await nextAttributeMutationNamed(page, "html", "aria-busy"),
    "true",
    "sets [aria-busy] on the document element"
  )
  assert.equal(
    await nextAttributeMutationNamed(page, "html", "aria-busy"),
    null,
    "removes [aria-busy] from the document element"
  )
})

test("test following a same-origin unannotated custom element link", async ({ page }) => {
  await nextBeat()
  await page.evaluate(() => {
    const shadowRoot = document.querySelector("#custom-link-element")?.shadowRoot
    const link = shadowRoot?.querySelector("a")
    link?.click()
  })
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(search(page.url()), "")
  assert.equal(await visitAction(page), "advance")
})

test("test following a same-origin unannotated link with search params", async ({ page }) => {
  page.click("#same-origin-unannotated-link-search-params")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(search(page.url()), "?key=value")
  assert.equal(await visitAction(page), "advance")
})

test("test following a same-origin unannotated form[method=GET]", async ({ page }) => {
  page.click("#same-origin-unannotated-form button")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "advance")
})

test("test following a same-origin data-turbo-action=replace link", async ({ page }) => {
  page.click("#same-origin-replace-link")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "replace")
})

test("test following a same-origin GET form[data-turbo-action=replace]", async ({ page }) => {
  page.click("#same-origin-replace-form-get button")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "replace")
})

test("test following a same-origin GET form button[data-turbo-action=replace]", async ({ page }) => {
  page.click("#same-origin-replace-form-submitter-get button")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "replace")
})

test("test following a same-origin POST form[data-turbo-action=replace]", async ({ page }) => {
  page.click("#same-origin-replace-form-post button")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "replace")
})

test("test following a same-origin POST form button[data-turbo-action=replace]", async ({ page }) => {
  await page.click("#same-origin-replace-form-submitter-post button")
  await nextEventNamed(page, "turbo:load")

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "replace")
})

test("test following a POST form clears cache", async ({ page }) => {
  await page.evaluate(() => {
    const cachedElement = document.createElement("some-cached-element")
    document.body.appendChild(cachedElement)
  })

  await page.click("#form-post-submit")
  await nextBeat() // 301 redirect response
  await nextBeat() // 200 response
  await page.goBack()
  assert.notOk(await hasSelector(page, "some-cached-element"))
})

test("test following a same-origin POST link with data-turbo-action=replace", async ({ page }) => {
  page.click("#same-origin-replace-post-link")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "replace")
})

test("test following a same-origin data-turbo=false link", async ({ page }) => {
  page.click("#same-origin-false-link")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "load")
})

test("test following a same-origin unannotated link inside a data-turbo=false container", async ({ page }) => {
  page.click("#same-origin-unannotated-link-inside-false-container")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "load")
})

test("test following a same-origin data-turbo=true link inside a data-turbo=false container", async ({ page }) => {
  page.click("#same-origin-true-link-inside-false-container")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "advance")
})

test("test following a same-origin anchored link", async ({ page }) => {
  await page.click("#same-origin-anchored-link")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(hash(page.url()), "#element-id")
  assert.equal(await visitAction(page), "advance")
  assert(await isScrolledToSelector(page, "#element-id"))
})

test("test following a same-origin link to a named anchor", async ({ page }) => {
  await page.click("#same-origin-anchored-link-named")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(hash(page.url()), "#named-anchor")
  assert.equal(await visitAction(page), "advance")
  assert(await isScrolledToSelector(page, "[name=named-anchor]"))
})

test("test following a cross-origin unannotated link", async ({ page }) => {
  await page.click("#cross-origin-unannotated-link")
  await nextBody(page)
  assert.equal(page.url(), "about:blank")
  assert.equal(await visitAction(page), "load")
})

test("test following a same-origin [target] link", async ({ page }) => {
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.click("#same-origin-targeted-link")])

  assert.equal(pathname(popup.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(popup), "load")
})

test("test following a same-origin [download] link", async ({ page }) => {
  assert.notOk<boolean>(
    await willChangeBody(page, async () => {
      await page.click("#same-origin-download-link")
      await nextBeat()
    })
  )
  assert.equal(pathname(page.url()), "/src/tests/fixtures/navigation.html")
  assert.equal(await visitAction(page), "load")
})

test("test following a same-origin link inside an SVG element", async ({ page }) => {
  await page.click("#same-origin-link-inside-svg-element", { force: true })
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "advance")
})

test("test following a cross-origin link inside an SVG element", async ({ page }) => {
  await page.click("#cross-origin-link-inside-svg-element", { force: true })
  await nextBody(page)
  assert.equal(page.url(), "about:blank")
  assert.equal(await visitAction(page), "load")
})

test("test clicking the back button", async ({ page }) => {
  await page.click("#same-origin-unannotated-link")
  await nextBody(page)
  await page.goBack()
  assert.equal(pathname(page.url()), "/src/tests/fixtures/navigation.html")
  assert.equal(await visitAction(page), "restore")
})

test("test clicking the forward button", async ({ page }) => {
  await page.click("#same-origin-unannotated-link")
  await nextBody(page)
  await page.goBack()
  await page.goForward()
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "restore")
})

test("test link targeting a disabled turbo-frame navigates the page", async ({ page }) => {
  await page.click("#link-to-disabled-frame")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/hello.html")
})

test("test skip link with hash-only path scrolls to the anchor without a visit", async ({ page }) => {
  assert.notOk<boolean>(
    await willChangeBody(page, async () => {
      await page.click('a[href="#main"]')
      await nextBeat()
    })
  )

  assert.ok(await isScrolledToSelector(page, "#main"), "scrolled to #main")
})

test("test skip link with hash-only path moves focus and changes tab order", async ({ page }) => {
  await page.click('a[href="#main"]')
  await nextBeat()
  await page.press("#main", "Tab")

  assert.notOk(await selectorHasFocus(page, "#ignored-link"), "skips interactive elements before #main")
  assert.ok(
    await selectorHasFocus(page, "#same-origin-unannotated-link"),
    "skips to first interactive element after #main"
  )
})

test("test same-page anchored replace link assumes the intention was a refresh", async ({ page }) => {
  await page.click("#refresh-link")
  await nextBody(page)
  assert.ok(await isScrolledToSelector(page, "#main"), "scrolled to #main")
})

test("test navigating back to anchored URL", async ({ page }) => {
  await clickWithoutScrolling(page, 'a[href="#main"]', { hasText: "Skip Link" })
  await nextBeat()

  await clickWithoutScrolling(page, "#same-origin-unannotated-link")
  await nextBody(page)
  await nextBeat()

  await page.goBack()
  await nextBody(page)

  assert.ok(await isScrolledToSelector(page, "#main"), "scrolled to #main")
})

test("test following a redirection", async ({ page }) => {
  await page.click("#redirection-link")
  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "replace")
})

test("test clicking the back button after redirection", async ({ page }) => {
  await page.click("#redirection-link")
  await nextBody(page)
  await page.goBack()
  assert.equal(pathname(page.url()), "/src/tests/fixtures/navigation.html")
  assert.equal(await visitAction(page), "restore")
})

test("test same-page anchor visits do not trigger visit events", async ({ page }) => {
  const events = [
    "turbo:before-visit",
    "turbo:visit",
    "turbo:before-cache",
    "turbo:before-render",
    "turbo:render",
    "turbo:load",
  ]

  for (const eventName in events) {
    await page.goto("/src/tests/fixtures/navigation.html")
    await page.click('a[href="#main"]')
    assert.ok(await noNextEventNamed(page, eventName), `same-page links do not trigger ${eventName} events`)
  }
})

test("test correct referrer header", async ({ page }) => {
  page.click("#headers-link")
  await nextBody(page)
  const pre = await page.textContent("pre")
  const headers = await JSON.parse(pre || "")
  assert.equal(
    headers.referer,
    "http://localhost:9000/src/tests/fixtures/navigation.html",
    `referer header is correctly set`
  )
})

test("test double-clicking on a link", async ({ page }) => {
  await page.click("#delayed-link", { clickCount: 2 })
  await nextBeat()

  await nextEventNamed(page, "turbo:load")

  assert.equal(pathname(page.url()), "/__turbo/delayed_response")
  assert.equal(await visitAction(page), "advance")
})

test("test does not fire turbo:load twice after following a redirect", async ({ page }) => {
  page.click("#redirection-link")

  await nextBeat() // 301 redirect response
  await noNextEventNamed(page, "turbo:load")
  await nextBeat() // 200 response
  await nextBody(page)
  await nextEventNamed(page, "turbo:load")
})

test("test navigating back whilst a visit is in-flight", async ({ page }) => {
  page.click("#delayed-link")
  await nextEventNamed(page, "turbo:before-render")
  await page.goBack()

  assert.ok(
    await nextEventNamed(page, "turbo:visit"),
    "navigating back whilst a visit is in-flight starts a non-silent Visit"
  )

  await nextBody(page)
  assert.equal(pathname(page.url()), "/src/tests/fixtures/navigation.html")
  assert.equal(await visitAction(page), "restore")
})

test("test ignores links that target an iframe", async ({ page }) => {
  await page.click("#targets-iframe")
  await nextBeat()

  assert.equal(pathname(page.url()), "/src/tests/fixtures/navigation.html")
})

test("test visit events are dispatched on the initiator", async ({ page }) => {
  await page.click("#same-origin-unannotated-link")
  await nextEventOnTarget(page, "same-origin-unannotated-link", "turbo:before-visit")
  await nextEventOnTarget(page, "same-origin-unannotated-link", "turbo:visit")
})

test("test fetch events are dispatched on the initiator", async ({ page }) => {
  await page.click("#same-origin-unannotated-link")
  await nextEventOnTarget(page, "same-origin-unannotated-link", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "same-origin-unannotated-link", "turbo:before-fetch-response")
})
