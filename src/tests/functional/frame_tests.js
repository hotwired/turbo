import { test, expect } from "@playwright/test"
import { assert, Assertion } from "chai"
import {
  attributeForSelector,
  hasSelector,
  listenForEventOnTarget,
  nextAttributeMutationNamed,
  noNextAttributeMutationNamed,
  nextBeat,
  nextEventNamed,
  nextEventOnTarget,
  noNextEventNamed,
  noNextEventOnTarget,
  pathname,
  propertyForSelector,
  readEventLogs,
  scrollPosition,
  scrollToSelector,
  searchParams
} from "../helpers/page"

assert.equalIgnoringWhitespace = function (actual, expected, message) {
  new Assertion(actual?.trim()).to.equal(expected.trim(), message)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/frames.html")
  await readEventLogs(page)
})

test("test navigating a frame with Turbo.visit", async ({ page }) => {
  const pathname = "/src/tests/fixtures/frames/frame.html"

  await page.locator("#frame").evaluate((frame) => frame.setAttribute("disabled", ""))
  await page.evaluate((pathname) => window.Turbo.visit(pathname, { frame: "frame" }), pathname)
  await nextBeat()

  assert.equal(await page.textContent("#frame h2"), "Frames: #frame", "does not navigate a disabled frame")

  await page.locator("#frame").evaluate((frame) => frame.removeAttribute("disabled"))
  await page.evaluate((pathname) => window.Turbo.visit(pathname, { frame: "frame" }), pathname)
  await nextBeat()

  assert.equal(await page.textContent("#frame h2"), "Frame: Loaded", "navigates the target frame")
})

test("test navigating a frame a second time does not leak event listeners", async ({ page }) => {
  await withoutChangingEventListenersCount(page, async () => {
    await page.click("#outer-frame-link")
    await nextEventOnTarget(page, "frame", "turbo:frame-load")
    await page.click("#outside-frame-form")
    await nextEventOnTarget(page, "frame", "turbo:frame-load")
    await page.click("#outer-frame-link")
    await nextEventOnTarget(page, "frame", "turbo:frame-load")
  })
})

test("test following a link preserves the current <turbo-frame> element's attributes", async ({ page }) => {
  const currentPath = pathname(page.url())

  await page.click("#hello a")
  await nextBeat()

  const frame = await page.locator("turbo-frame#frame")
  assert.equal(await frame.getAttribute("data-loaded-from"), currentPath)
  assert.equal(await frame.getAttribute("src"), await propertyForSelector(page, "#hello a", "href"))
})

test("test following a link sets the frame element's [src]", async ({ page }) => {
  await page.click("#link-frame-with-search-params")

  const { url } = await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  const fetchRequestUrl = new URL(url)

  assert.equal(fetchRequestUrl.pathname, "/src/tests/fixtures/frames/frame.html")
  assert.equal(fetchRequestUrl.searchParams.get("key"), "value", "fetch request encodes query parameters")

  await nextBeat()
  const src = new URL((await attributeForSelector(page, "#frame", "src")) || "")

  assert.equal(src.pathname, "/src/tests/fixtures/frames/frame.html")
  assert.equal(src.searchParams.get("key"), "value", "[src] attribute encodes query parameters")
})

test("test a frame whose src references itself does not infinitely loop", async ({ page }) => {
  await page.click("#frame-self")

  await nextEventOnTarget(page, "frame", "turbo:frame-render")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, undefined | undefined, "no more events")
})

test("test following a link driving a frame toggles the [aria-busy=true] attribute", async ({ page }) => {
  await page.click("#hello a")

  assert.equal(await nextAttributeMutationNamed(page, "frame", "busy"), "", "sets [busy] on the #frame")
  assert.equal(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    "true",
    "sets [aria-busy=true] on the #frame"
  )
  assert.equal(await nextAttributeMutationNamed(page, "frame", "busy"), null, "removes [busy] on the #frame")
  assert.equal(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    null,
    "removes [aria-busy] from the #frame"
  )
})

test("test following an a[data-turbo-frame=_top] does not toggle the frame's [aria-busy=true] attribute", async ({
  page
}) => {
  await page.click("#frame #link-top")

  assert.ok(await noNextAttributeMutationNamed(page, "frame", "busy"), "does not toggle [busy] on parent frame")
  assert.ok(
    await noNextAttributeMutationNamed(page, "frame", "aria-busy"),
    "does not toggle [aria-busy=true] on parent frame"
  )
})

test("test submitting a form[data-turbo-frame=_top] does not toggle the frame's [aria-busy=true] attribute", async ({
  page
}) => {
  await page.click("#frame #form-submit-top")

  assert.ok(await noNextAttributeMutationNamed(page, "frame", "busy"), "does not toggle [busy] on parent frame")
  assert.ok(
    await noNextAttributeMutationNamed(page, "frame", "aria-busy"),
    "does not toggle [aria-busy=true] on parent frame"
  )
})

test("successfully following a link to a page without a matching frame dispatches a turbo:frame-missing event", async ({
  page
}) => {
  await page.click("#missing-frame-link")
  const { response } = await nextEventOnTarget(page, "missing", "turbo:frame-missing")

  assert.equal(200, response.status)
})

test("successfully following a link to a page without a matching frame shows an error and throws an exception", async ({
  page
}) => {
  let error = undefined
  page.once("pageerror", (e) => (error = e))

  await page.click("#missing-frame-link")

  assert.match(await page.innerText("#missing"), /Content missing/)

  assert.exists(error)
  assert.include(error.message, `The response (200) did not contain the expected <turbo-frame id="missing">`)
})

test("successfully following a link to a page with `turbo-visit-control` `reload` performs a full page reload", async ({
  page
}) => {
  await page.click("#unvisitable-page-link")
  await page.getByText("Unvisitable page loaded").waitFor()

  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/unvisitable.html")
})

test("failing to follow a link to a page without a matching frame dispatches a turbo:frame-missing event", async ({
  page
}) => {
  await page.click("#missing-page-link")
  const { response } = await nextEventOnTarget(page, "missing", "turbo:frame-missing")

  assert.equal(404, response.status)
})

test("failing to follow a link to a page without a matching frame shows an error and throws an exception", async ({
  page
}) => {
  let error = undefined
  page.once("pageerror", (e) => (error = e))

  await page.click("#missing-page-link")

  assert.match(await page.innerText("#missing"), /Content missing/)

  assert.exists(error)
  assert.include(error.message, `The response (404) did not contain the expected <turbo-frame id="missing">`)
})

test("test the turbo:frame-missing event following a link to a page without a matching frame can be handled", async ({
  page
}) => {
  await page.locator("#missing").evaluate((frame) => {
    frame.addEventListener(
      "turbo:frame-missing",
      (event) => {
        if (event.target instanceof Element) {
          event.preventDefault()
          event.target.textContent = "Overridden"
        }
      },
      { once: true }
    )
  })
  await page.click("#missing-frame-link")
  await nextEventOnTarget(page, "missing", "turbo:frame-missing")

  assert.equal(await page.textContent("#missing"), "Overridden")
})

test("test the turbo:frame-missing event following a link to a page without a matching frame can drive a Visit", async ({
  page
}) => {
  await page.locator("#missing").evaluate((frame) => {
    frame.addEventListener(
      "turbo:frame-missing",
      (event) => {
        event.preventDefault()
        const { response, visit } = event.detail

        visit(response)
      },
      { once: true }
    )
  })
  await page.click("#missing-frame-link")
  await nextEventOnTarget(page, "missing", "turbo:frame-missing")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "Frames: #frame")
  assert.notOk(await hasSelector(page, "turbo-frame#missing"))

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames.html")
  assert.ok(await hasSelector(page, "#missing-frame-link"))
})

test("test following a link to a page with a matching frame does not dispatch a turbo:frame-missing event", async ({
  page
}) => {
  await page.click("#link-frame")

  assert.ok(await noNextEventNamed(page, "turbo:frame-missing"))

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const src = await attributeForSelector(page, "#frame", "src")
  assert(
    src?.includes("/src/tests/fixtures/frames/frame.html"),
    "navigates frame without dispatching turbo:frame-missing"
  )
})

test("test following a link within a frame with a target set navigates the target frame", async ({ page }) => {
  await page.click("#hello a")
  await nextBeat()

  const frameText = await page.textContent("#frame h2")
  assert.equal(frameText, "Frame: Loaded")
})

test("test following a link in rapid succession cancels the previous request", async ({ page }) => {
  await page.click("#outside-frame-form")
  await page.click("#outer-frame-link")
  await nextBeat()

  const frameText = await page.textContent("#frame h2")
  assert.equal(frameText, "Frame: Loaded")
})

test("test following a link within a descendant frame whose ancestor declares a target set navigates the descendant frame", async ({
  page
}) => {
  const selector = "#nested-root[target=frame] #nested-child a:not([data-turbo-frame])"
  const link = await page.locator(selector)
  const href = await propertyForSelector(page, selector, "href")

  await link.click()
  await nextBeat()

  const frame = await page.textContent("#frame h2")
  const nestedRoot = await page.textContent("#nested-root h2")
  const nestedChild = await page.textContent("#nested-child")
  assert.equal(frame, "Frames: #frame")
  assert.equal(nestedRoot, "Frames: #nested-root")
  assert.equalIgnoringWhitespace(nestedChild, "Frame: Loaded")
  assert.equal(await attributeForSelector(page, "#frame", "src"), null)
  assert.equal(await attributeForSelector(page, "#nested-root", "src"), null)
  assert.equal(await attributeForSelector(page, "#nested-child", "src"), href || "")
})

test("test following a link that declares data-turbo-frame within a frame whose ancestor respects the override", async ({
  page
}) => {
  await page.click("#nested-root[target=frame] #nested-child a[data-turbo-frame]")
  await nextBeat()

  const frameText = await page.textContent("body > h1")
  assert.equal(frameText, "One")
  assert.notOk(await hasSelector(page, "#frame"))
  assert.notOk(await hasSelector(page, "#nested-root"))
  assert.notOk(await hasSelector(page, "#nested-child"))
})

test("test following a form within a nested frame with form target top", async ({ page }) => {
  await page.click("#nested-child-navigate-form-top-submit")
  await nextBeat()

  const frameText = await page.textContent("body > h1")
  assert.equal(frameText, "One")
  assert.notOk(await hasSelector(page, "#frame"))
  assert.notOk(await hasSelector(page, "#nested-root"))
  assert.notOk(await hasSelector(page, "#nested-child"))
})

test("test following a form within a nested frame with child frame target top", async ({ page }) => {
  await page.click("#nested-child-navigate-top-submit")
  await nextBeat()

  const frameText = await page.textContent("body > h1")
  assert.equal(frameText, "One")
  assert.notOk(await hasSelector(page, "#frame"))
  assert.notOk(await hasSelector(page, "#nested-root"))
  assert.notOk(await hasSelector(page, "#nested-child-navigate-top"))
})

test("test following a link within a frame with target=_top navigates the page", async ({ page }) => {
  assert.equal(await attributeForSelector(page, "#navigate-top", "src"), null)

  await page.click("#navigate-top a:not([data-turbo-frame])")
  await nextBeat()

  const frameText = await page.textContent("body > h1")
  assert.equal(frameText, "One")
  assert.notOk(await hasSelector(page, "#navigate-top a"))
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await searchParams(page.url()).get("key"), "value")
})

test("test following a link that declares data-turbo-frame='_self' within a frame with target=_top navigates the frame itself", async ({
  page
}) => {
  assert.equal(await attributeForSelector(page, "#navigate-top", "src"), null)

  await page.click("#navigate-top a[data-turbo-frame='_self']")
  await nextBeat()

  const title = await page.textContent("body > h1")
  assert.equal(title, "Frames")
  assert.ok(await hasSelector(page, "#navigate-top"))
  const frame = await page.textContent("#navigate-top")
  assert.equalIgnoringWhitespace(frame, "Replaced only the frame")
})

test("test following a link to a page with a <turbo-frame recurse> which lazily loads a matching frame", async ({
  page
}) => {
  await page.click("#recursive summary")

  assert.ok(await hasSelector(page, "#recursive details[open]"))

  await page.click("#recursive a")
  await nextEventOnTarget(page, "recursive", "turbo:frame-load")
  await nextEventOnTarget(page, "composer", "turbo:frame-load")

  assert.ok(await hasSelector(page, "#recursive details:not([open])"))
})

test("test submitting a form that redirects to a page with a <turbo-frame recurse> which lazily loads a matching frame", async ({
  page
}) => {
  await page.click("#recursive summary")

  assert.ok(await hasSelector(page, "#recursive details[open]"))

  await page.click("#recursive input[type=submit]")
  await nextEventOnTarget(page, "recursive", "turbo:frame-load")
  await nextEventOnTarget(page, "composer", "turbo:frame-load")

  assert.ok(await hasSelector(page, "#recursive details:not([open])"))
})

test("test removing [disabled] attribute from eager-loaded frame navigates it", async ({ page }) => {
  await page.evaluate(() => document.getElementById("frame")?.setAttribute("disabled", ""))
  await page.evaluate(() =>
    document.getElementById("frame")?.setAttribute("src", "/src/tests/fixtures/frames/frame.html")
  )

  assert.ok(
    await noNextEventOnTarget(page, "frame", "turbo:before-fetch-request"),
    "[disabled] frames do not submit requests"
  )

  await page.evaluate(() => document.getElementById("frame")?.removeAttribute("disabled"))

  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
})

test("test evaluates frame script elements on each render", async ({ page }) => {
  assert.equal(await frameScriptEvaluationCount(page), undefined)

  await page.click("#body-script-link")
  await nextEventOnTarget(page, "body-script", "turbo:frame-load")
  assert.equal(await frameScriptEvaluationCount(page), 1)

  await page.click("#body-script-link")
  await nextEventOnTarget(page, "body-script", "turbo:frame-load")
  assert.equal(await frameScriptEvaluationCount(page), 2)
})

test("test does not evaluate data-turbo-eval=false scripts", async ({ page }) => {
  await page.click("#eval-false-script-link")
  await nextBeat()
  assert.equal(await frameScriptEvaluationCount(page), undefined)
})

test("test redirecting in a form is still navigatable after redirect", async ({ page }) => {
  await page.click("#navigate-form-redirect")
  await nextEventOnTarget(page, "form-redirect", "turbo:frame-load")
  assert.equal(await page.textContent("turbo-frame#form-redirect h2"), "Form Redirect")

  await page.click("#submit-form")
  await nextEventOnTarget(page, "form-redirect", "turbo:frame-load")
  assert.equal(await page.textContent("turbo-frame#form-redirect h2"), "Form Redirected")

  await page.click("#navigate-form-redirect")
  await nextEventOnTarget(page, "form-redirect", "turbo:frame-load")

  assert.equal(await page.textContent("turbo-frame#form-redirect h2"), "Form Redirect")
})

test("test 'turbo:frame-render' is triggered after frame has finished rendering", async ({ page }) => {
  await page.click("#frame-part")

  await nextEventNamed(page, "turbo:frame-render") // recursive
  const { fetchResponse } = await nextEventNamed(page, "turbo:frame-render")

  assert.include(fetchResponse.response.url, "/src/tests/fixtures/frames/part.html")
})

test("test navigating a frame from an outer form fires events", async ({ page }) => {
  await page.click("#outside-frame-form")

  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  const { fetchResponse } = await nextEventOnTarget(page, "frame", "turbo:frame-render")
  assert.include(fetchResponse.response.url, "/src/tests/fixtures/frames/form.html")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, undefined | undefined, "no more events")
})

test("test navigating a frame from an outer link fires events", async ({ page }) => {
  await listenForEventOnTarget(page, "outside-frame-form", "turbo:click")
  await page.click("#outside-frame-form")

  await nextEventOnTarget(page, "outside-frame-form", "turbo:click")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  const { fetchResponse } = await nextEventOnTarget(page, "frame", "turbo:frame-render")
  assert.include(fetchResponse.response.url, "/src/tests/fixtures/frames/form.html")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, undefined | undefined, "no more events")
})

test("test navigating a frame from an inner link fires events", async ({ page }) => {
  await listenForEventOnTarget(page, "link-frame", "turbo:click")
  await page.click("#link-frame")

  await nextEventOnTarget(page, "link-frame", "turbo:click")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  const { fetchResponse } = await nextEventOnTarget(page, "frame", "turbo:frame-render")
  assert.include(fetchResponse.response.url, "/src/tests/fixtures/frames/frame.html")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, undefined | undefined, "no more events")
})

test("test navigating a frame targeting _top from an outer link fires events", async ({ page }) => {
  await listenForEventOnTarget(page, "outside-navigate-top-link", "turbo:click")
  await page.click("#outside-navigate-top-link")

  await nextEventOnTarget(page, "outside-navigate-top-link", "turbo:click")
  await nextEventOnTarget(page, "html", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "html", "turbo:before-fetch-response")
  await nextEventOnTarget(page, "html", "turbo:before-render")
  await nextEventOnTarget(page, "html", "turbo:render")
  await nextEventOnTarget(page, "html", "turbo:load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, undefined | undefined, "no more events")
})

test("test invoking .reload() re-fetches the frame's content", async ({ page }) => {
  await page.click("#link-frame")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")
  await page.evaluate(() => document.getElementById("frame").reload())

  const dispatchedEvents = await readEventLogs(page)

  assert.deepEqual(
    dispatchedEvents.map(([name, _, id]) => [id, name]),
    [
      ["frame", "turbo:before-fetch-request"],
      ["frame", "turbo:before-fetch-response"],
      ["frame", "turbo:before-frame-render"],
      ["frame", "turbo:frame-render"],
      ["frame", "turbo:frame-load"]
    ]
  )
})

test("test following inner link reloads frame on every click", async ({ page }) => {
  await page.click("#hello a")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#hello a")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("test following outer link reloads frame on every click", async ({ page }) => {
  await page.click("#outer-frame-link")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#outer-frame-link")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("test following outer form reloads frame on every submit", async ({ page }) => {
  await page.click("#outer-frame-submit")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#outer-frame-submit")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("test an inner/outer link reloads frame on every click", async ({ page }) => {
  await page.click("#inner-outer-frame-link")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#inner-outer-frame-link")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("test an inner/outer form reloads frame on every submit", async ({ page }) => {
  await page.click("#inner-outer-frame-submit")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#inner-outer-frame-submit")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("test reconnecting after following a link does not reload the frame", async ({ page }) => {
  await page.click("#hello a")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.evaluate(() => {
    window.savedElement = document.querySelector("#frame")
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
  assert.equal(requestLogs.length, undefined | undefined)
})

test("test navigating pushing URL state from a frame navigation fires events", async ({ page }) => {
  await page.click("#link-outside-frame-action-advance")

  assert.equal(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    "true",
    "sets aria-busy on the <turbo-frame>"
  )
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  await nextEventOnTarget(page, "frame", "turbo:frame-render")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")
  assert.notOk(await nextAttributeMutationNamed(page, "frame", "aria-busy"), "removes aria-busy from the <turbo-frame>")

  assert.equal(await nextAttributeMutationNamed(page, "html", "aria-busy"), "true", "sets aria-busy on the <html>")
  await nextEventOnTarget(page, "html", "turbo:before-visit")
  await nextEventOnTarget(page, "html", "turbo:visit")
  await nextEventOnTarget(page, "html", "turbo:before-cache")
  await nextEventOnTarget(page, "html", "turbo:before-render")
  await nextEventOnTarget(page, "html", "turbo:render")
  await nextEventOnTarget(page, "html", "turbo:load")
  assert.notOk(await nextAttributeMutationNamed(page, "html", "aria-busy"), "removes aria-busy from the <html>")
})

test("test navigating a frame with a form[method=get] that does not redirect still updates the [src]", async ({
  page
}) => {
  await page.click("#frame-form-get-no-redirect")
  await nextEventNamed(page, "turbo:before-fetch-request")
  await nextEventNamed(page, "turbo:before-fetch-response")
  await nextEventOnTarget(page, "frame", "turbo:frame-render")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  assert.ok(await noNextEventNamed(page, "turbo:before-fetch-request"))

  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
  assert.equal(await page.textContent("h1"), "Frames")
  assert.equal(await page.textContent("#frame h2"), "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames.html")
})

test("test navigating turbo-frame[data-turbo-action=advance] from within pushes URL state", async ({ page }) => {
  await page.click("#add-turbo-action-to-frame")
  await page.click("#link-frame")
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")

  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame.html")
})

test("test navigating turbo-frame[data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state", async ({
  page
}) => {
  await page.click("#link-outside-frame-action-advance")
  await nextEventNamed(page, "turbo:load")
  await page.click("#link-outside-frame-action-advance")
  await nextEventNamed(page, "turbo:load")
  await page.click("#link-outside-frame-action-advance")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await attributeForSelector(page, "#frame", "aria-busy"), null, "clears turbo-frame[aria-busy]")
  assert.equal(await attributeForSelector(page, "#html", "aria-busy"), null, "clears html[aria-busy]")
  assert.equal(await attributeForSelector(page, "#html", "data-turbo-preview"), null, "clears html[aria-busy]")
})

test("test navigating a turbo-frame with an a[data-turbo-action=advance] preserves page state", async ({ page }) => {
  await scrollToSelector(page, "#below-the-fold-input")
  await page.fill("#below-the-fold-input", "a value")
  await page.click("#below-the-fold-link-frame-action")
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame.html")
  assert.equal(await propertyForSelector(page, "#below-the-fold-input", "value"), "a value", "preserves page state")

  const { y } = await scrollPosition(page)
  assert.notEqual(y, undefined | undefined, "preserves Y scroll position")
})

test("test a turbo-frame that has been driven by a[data-turbo-action] can be navigated normally", async ({ page }) => {
  await page.click("#remove-target-from-hello")
  await page.click("#link-hello-advance")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "Frames")
  assert.equal(await page.textContent("#hello h2"), "Hello from a frame")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/hello.html")

  await page.click("#hello a")
  await nextEventOnTarget(page, "hello", "turbo:frame-load")

  assert.ok(await noNextEventNamed(page, "turbo:load"))
  assert.equal(await page.textContent("#hello h2"), "Frames: #hello")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/hello.html")
})

test("test navigating turbo-frame from within with a[data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#link-nested-frame-action-advance")
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame.html")
  assert.ok(await hasSelector(page, "#frame[complete]"), "marks the frame as [complete]")
})

test("test navigating frame with a[data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#link-outside-frame-action-advance")
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame.html")
  assert.ok(await hasSelector(page, "#frame[complete]"), "marks the frame as [complete]")
})

test("test navigating frame with form[method=get][data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#form-get-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame.html")
  assert.ok(await hasSelector(page, "#frame[complete]"), "marks the frame as [complete]")
})

test("test navigating frame with form[method=get][data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state", async ({
  page
}) => {
  await page.click("#form-get-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")
  await page.click("#form-get-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")
  await page.click("#form-get-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await attributeForSelector(page, "#frame", "aria-busy"), null, "clears turbo-frame[aria-busy]")
  assert.equal(await attributeForSelector(page, "#html", "aria-busy"), null, "clears html[aria-busy]")
  assert.equal(await attributeForSelector(page, "#html", "data-turbo-preview"), null, "clears html[aria-busy]")
})

test("test navigating frame with form[method=post][data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#form-post-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame.html")
  assert.ok(await hasSelector(page, "#frame[complete]"), "marks the frame as [complete]")
})

test("test navigating frame with form[method=post][data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state", async ({
  page
}) => {
  await page.click("#form-post-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")
  await page.click("#form-post-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")
  await page.click("#form-post-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await attributeForSelector(page, "#frame", "aria-busy"), null, "clears turbo-frame[aria-busy]")
  assert.equal(await attributeForSelector(page, "#html", "aria-busy"), null, "clears html[aria-busy]")
  assert.equal(await attributeForSelector(page, "#html", "data-turbo-preview"), null, "clears html[aria-busy]")
  assert.ok(await hasSelector(page, "#frame[complete]"), "marks the frame as [complete]")
})

test("test navigating frame with button[data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#button-frame-action-advance")
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame.html")
  assert.ok(await hasSelector(page, "#frame[complete]"), "marks the frame as [complete]")
})

test("test navigating back after pushing URL state from a turbo-frame[data-turbo-action=advance] restores the frames previous contents", async ({
  page
}) => {
  await page.click("#add-turbo-action-to-frame")
  await page.click("#link-frame")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")

  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frames: #frame")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames.html")
  assert.equal(await attributeForSelector(page, "#frame", "src"), null)
  assert.equal(await propertyForSelector(page, "#frame", "src"), null)
})

test("test navigating back then forward after pushing URL state from a turbo-frame[data-turbo-action=advance] restores the frames next contents", async ({
  page
}) => {
  await page.click("#add-turbo-action-to-frame")
  await page.click("#link-frame")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")
  await page.goForward()
  await nextEventNamed(page, "turbo:load")

  const title = await page.textContent("h1")
  const frameTitle = await page.textContent("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
  assert.equal(title, "Frames")
  assert.equal(frameTitle, "Frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/frame.html")
  assert.ok(await hasSelector(page, "#frame[complete]"), "marks the frame as [complete]")
})

test("test turbo:before-fetch-request fires on the frame element", async ({ page }) => {
  await page.click("#hello a")
  assert.ok(await nextEventOnTarget(page, "frame", "turbo:before-fetch-request"))
})

test("test turbo:before-fetch-response fires on the frame element", async ({ page }) => {
  await page.click("#hello a")
  assert.ok(await nextEventOnTarget(page, "frame", "turbo:before-fetch-response"))
})

test("test navigating a eager frame with a link[method=get] that does not fetch eager frame twice", async ({
  page
}) => {
  await page.click("#link-to-eager-loaded-frame")

  await nextBeat()

  const eventLogs = await readEventLogs(page)
  const fetchLogs = eventLogs.filter(
    ([name, options]) =>
      name == "turbo:before-fetch-request" && options?.url?.includes("/src/tests/fixtures/frames/frame_for_eager.html")
  )
  assert.equal(fetchLogs.length, 1)

  const src = (await attributeForSelector(page, "#eager-loaded-frame", "src")) ?? ""
  assert.ok(src.includes("/src/tests/fixtures/frames/frame_for_eager.html"), "updates src attribute")
  assert.equal(await page.textContent("h1"), "Eager-loaded frame")
  assert.equal(await page.textContent("#eager-loaded-frame h2"), "Eager-loaded frame: Loaded")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/page_with_eager_frame.html")
})

test("form submissions from frames clear snapshot cache", async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector("h1").textContent = "Changed"
  })

  await expect(page.locator("h1")).toHaveText("Changed")

  await page.click("#navigate-form-redirect-as-new")
  await expect(page.locator("h1")).toHaveText("Page One Form")
  await page.click("#submit-form")
  await expect(page.locator("h2")).toHaveText("Form Redirected")
  await page.goBack()

  await expect(page.locator("h1")).not.toHaveText("Changed")
})

async function withoutChangingEventListenersCount(page, callback) {
  const name = "eventListenersAttachedToDocument"
  const setup = () => {
    return page.evaluate((name) => {
      const context = window
      context[name] = undefined | undefined
      context.originals = {
        addEventListener: document.addEventListener,
        removeEventListener: document.removeEventListener
      }

      document.addEventListener = (type, listener, options) => {
        context.originals.addEventListener.call(document, type, listener, options)
        context[name] += 1
      }

      document.removeEventListener = (type, listener, options) => {
        context.originals.removeEventListener.call(document, type, listener, options)
        context[name] -= 1
      }

      return context[name] || undefined | undefined
    }, name)
  }

  const teardown = () => {
    return page.evaluate((name) => {
      const context = window
      const { addEventListener, removeEventListener } = context.originals

      document.addEventListener = addEventListener
      document.removeEventListener = removeEventListener

      return context[name] || undefined | undefined
    }, name)
  }

  await nextBeat()
  const originalCount = await setup()
  await callback()
  const finalCount = await teardown()

  assert.equal(finalCount, originalCount, "expected callback not to leak event listeners")
}

function frameScriptEvaluationCount(page) {
  return page.evaluate(() => window.frameScriptEvaluationCount)
}
