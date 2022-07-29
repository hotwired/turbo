import { Page, test } from "@playwright/test"
import { assert } from "chai"
import {
  getFromLocalStorage,
  getSearchParam,
  hasSelector,
  isScrolledToTop,
  nextAttributeMutationNamed,
  nextBeat,
  nextBody,
  nextEventNamed,
  nextEventOnTarget,
  noNextEventNamed,
  outerHTMLForSelector,
  pathname,
  readEventLogs,
  scrollToSelector,
  search,
  searchParams,
  setLocalStorageFromEvent,
  visitAction,
  waitUntilSelector,
  waitUntilNoSelector,
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html")
  await setLocalStorageFromEvent(page, "turbo:submit-start", "formSubmitStarted", "true")
  await setLocalStorageFromEvent(page, "turbo:submit-end", "formSubmitEnded", "true")
  await readEventLogs(page)
})

test("test standard form submission renders a progress bar", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setProgressBarDelay(0))
  await page.click("#standard form.sleep input[type=submit]")

  await waitUntilSelector(page, ".turbo-progress-bar")
  assert.ok(await hasSelector(page, ".turbo-progress-bar"), "displays progress bar")

  await nextBody(page)
  await waitUntilNoSelector(page, ".turbo-progress-bar")

  assert.notOk(await hasSelector(page, ".turbo-progress-bar"), "hides progress bar")
})

test("test form submission with confirmation confirmed", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Are you sure?")
    alert.accept()
  })

  await page.click("#standard form.confirm input[type=submit]")

  await nextEventNamed(page, "turbo:load")
  assert.ok(await formSubmitStarted(page))
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
})

test("test form submission with confirmation cancelled", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Are you sure?")
    alert.dismiss()
  })
  await page.click("#standard form.confirm input[type=submit]")

  assert.notOk(await formSubmitStarted(page))
})

test("test form submission with secondary submitter click - confirmation confirmed", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Are you really sure?")
    alert.accept()
  })

  await page.click("#standard form.confirm #secondary_submitter")

  await nextEventNamed(page, "turbo:load")
  assert.ok(await formSubmitStarted(page))
  assert.equal(await pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "advance")
  assert.equal(getSearchParam(page.url(), "greeting"), "secondary_submitter")
})

test("test form submission with secondary submitter click - confirmation cancelled", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Are you really sure?")
    alert.dismiss()
  })

  await page.click("#standard form.confirm #secondary_submitter")

  assert.notOk(await formSubmitStarted(page))
})

test("test from submission with confirmation overriden", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Overriden message")
    alert.accept()
  })

  await page.evaluate(() => window.Turbo.setConfirmMethod(() => Promise.resolve(confirm("Overriden message"))))
  await page.click("#standard form.confirm input[type=submit]")

  assert.ok(await formSubmitStarted(page))
})

test("test standard form submission does not render a progress bar before expiring the delay", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setProgressBarDelay(500))
  await page.click("#standard form.redirect input[type=submit]")

  assert.notOk(await hasSelector(page, ".turbo-progress-bar"), "does not show progress bar before delay")
})

test("test standard form submission with redirect response", async ({ page }) => {
  await page.click("#standard form.redirect input[type=submit]")
  await nextBody(page)

  assert.ok(await formSubmitStarted(page))
  assert.equal(await pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(await visitAction(page), "advance")
  assert.equal(getSearchParam(page.url(), "greeting"), "Hello from a redirect")
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

test("test standard POST form submission events", async ({ page }) => {
  await page.click("#standard-post-form-submit")

  assert.ok(await formSubmitStarted(page), "fires turbo:submit-start")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))

  await nextEventNamed(page, "turbo:before-fetch-response")

  assert.ok(await formSubmitEnded(page), "fires turbo:submit-end")

  await nextEventNamed(page, "turbo:before-visit")
  await nextEventNamed(page, "turbo:visit")
  await nextEventNamed(page, "turbo:before-render")
  await nextEventNamed(page, "turbo:render")
  await nextEventNamed(page, "turbo:load")
})

test("test standard POST form submission merges values from both searchParams and body", async ({ page }) => {
  await page.click("#form-action-post-redirect-self-q-b")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "q"), "b")
  assert.equal(getSearchParam(page.url(), "sort"), "asc")
})

test("test standard POST form submission toggles submitter [disabled] attribute", async ({ page }) => {
  await page.click("#standard-post-form-submit")

  assert.equal(
    await nextAttributeMutationNamed(page, "standard-post-form-submit", "disabled"),
    "",
    "sets [disabled] on the submitter"
  )
  assert.equal(
    await nextAttributeMutationNamed(page, "standard-post-form-submit", "disabled"),
    null,
    "removes [disabled] from the submitter"
  )
})

test("test standard GET form submission", async ({ page }) => {
  await page.click("#standard form.greeting input[type=submit]")
  await nextBody(page)

  assert.ok(await formSubmitStarted(page))
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "advance")
  assert.equal(getSearchParam(page.url(), "greeting"), "Hello from a form")
})

test("test standard GET form submission with data-turbo-stream", async ({ page }) => {
  await page.click("#standard-get-form-with-stream-opt-in-submit")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
})

test("test standard GET form submission events", async ({ page }) => {
  await page.click("#standard-get-form-submit")

  assert.ok(await formSubmitStarted(page), "fires turbo:submit-start")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.notOk(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))

  await nextEventNamed(page, "turbo:before-fetch-response")

  assert.ok(await formSubmitEnded(page), "fires turbo:submit-end")

  await nextEventNamed(page, "turbo:before-visit")
  await nextEventNamed(page, "turbo:visit")
  await nextEventNamed(page, "turbo:before-cache")
  await nextEventNamed(page, "turbo:before-render")
  await nextEventNamed(page, "turbo:render")
  await nextEventNamed(page, "turbo:load")
})

test("test standard GET form submission does not incorporate the current page's URLSearchParams values into the submission", async ({
  page,
}) => {
  await page.click("#form-action-self-sort")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(search(page.url()), "?sort=asc")

  await page.click("#form-action-none-q-a")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(search(page.url()), "?q=a", "navigates without omitted keys")
})

test("test standard GET form submission does not merge values into the [action] attribute", async ({ page }) => {
  await page.click("#form-action-self-sort")
  await nextBody(page)

  assert.equal(await pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(await search(page.url()), "?sort=asc")

  await page.click("#form-action-self-q-b")
  await nextBody(page)

  assert.equal(await pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(await search(page.url()), "?q=b", "navigates without omitted keys")
})

test("test standard GET form submission omits the [action] value's URLSearchParams from the submission", async ({
  page,
}) => {
  await page.click("#form-action-self-submit")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(search(page.url()), "")
})

test("test standard GET form submission toggles submitter [disabled] attribute", async ({ page }) => {
  await page.click("#standard-get-form-submit")

  assert.equal(
    await nextAttributeMutationNamed(page, "standard-get-form-submit", "disabled"),
    "",
    "sets [disabled] on the submitter"
  )
  assert.equal(
    await nextAttributeMutationNamed(page, "standard-get-form-submit", "disabled"),
    null,
    "removes [disabled] from the submitter"
  )
})

test("test standard GET form submission appending keys", async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html?query=1")
  await page.click("#standard form.conflicting-values input[type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "query"), "2")
})

test("test standard form submission with empty created response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "body")
  const button = await page.locator("#standard form.created input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "body")
  assert.equal(htmlAfter, htmlBefore)
})

test("test standard form submission with empty no-content response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "body")
  const button = await page.locator("#standard form.no-content input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "body")
  assert.equal(htmlAfter, htmlBefore)
})

test("test standard POST form submission with multipart/form-data enctype", async ({ page }) => {
  await page.click("#standard form[method=post][enctype] input[type=submit]")
  await nextBeat()

  const enctype = getSearchParam(page.url(), "enctype")
  assert.ok(enctype?.startsWith("multipart/form-data"), "submits a multipart/form-data request")
})

test("test standard GET form submission ignores enctype", async ({ page }) => {
  await page.click("#standard form[method=get][enctype] input[type=submit]")
  await nextBeat()

  const enctype = getSearchParam(page.url(), "enctype")
  assert.notOk(enctype, "GET form submissions ignore enctype")
})

test("test standard POST form submission without an enctype", async ({ page }) => {
  await page.click("#standard form[method=post].no-enctype input[type=submit]")
  await nextBeat()

  const enctype = getSearchParam(page.url(), "enctype")
  assert.ok(
    enctype?.startsWith("application/x-www-form-urlencoded"),
    "submits a application/x-www-form-urlencoded request"
  )
})

test("test no-action form submission with single parameter", async ({ page }) => {
  await page.click("#no-action form.single input[type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "query"), "1")

  await page.click("#no-action form.single input[type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "query"), "1")

  await page.goto("/src/tests/fixtures/form.html?query=2")
  await page.click("#no-action form.single input[type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "query"), "1")
})

test("test no-action form submission with multiple parameters", async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html?query=2")
  await page.click("#no-action form.multiple input[type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.deepEqual(searchParams(page.url()).getAll("query"), ["1", "2"])

  await page.click("#no-action form.multiple input[type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.deepEqual(searchParams(page.url()).getAll("query"), ["1", "2"])
})

test("test no-action form submission submitter parameters", async ({ page }) => {
  await page.click("#no-action form.button-param [type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "query"), "1")
  assert.deepEqual(searchParams(page.url()).getAll("button"), [""])

  await page.click("#no-action form.button-param [type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "query"), "1")
  assert.deepEqual(searchParams(page.url()).getAll("button"), [""])
})

test("test submitter with blank formaction submits to the current page", async ({ page }) => {
  await page.click("#blank-formaction button")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.ok(await hasSelector(page, "#blank-formaction"), "overrides form[action] navigation")
})

test("test input named action with no action attribute", async ({ page }) => {
  await page.click("#action-input form.no-action [type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "action"), "1")
  assert.equal(getSearchParam(page.url(), "query"), "1")
})

test("test input named action with action attribute", async ({ page }) => {
  await page.click("#action-input form.action [type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(getSearchParam(page.url(), "action"), "1")
  assert.equal(getSearchParam(page.url(), "query"), "1")
})

test("test invalid form submission with unprocessable entity status", async ({ page }) => {
  await page.click("#reject form.unprocessable_entity input[type=submit]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Unprocessable Entity", "renders the response HTML")
  assert.notOk(await hasSelector(page, "#frame form.reject"), "replaces entire page")
})

test("test invalid form submission with long form", async ({ page }) => {
  await scrollToSelector(page, "#reject form.unprocessable_entity_with_tall_form input[type=submit]")
  await page.click("#reject form.unprocessable_entity_with_tall_form input[type=submit]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Unprocessable Entity", "renders the response HTML")
  assert(await isScrolledToTop(page), "page is scrolled to the top")
  assert.notOk(await hasSelector(page, "#frame form.reject"), "replaces entire page")
})

test("test invalid form submission with server error status", async ({ page }) => {
  assert(await hasSelector(page, "head > #form-fixture-styles"))
  await page.click("#reject form.internal_server_error input[type=submit]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Internal Server Error", "renders the response HTML")
  assert.notOk(await hasSelector(page, "head > #form-fixture-styles"), "replaces head")
  assert.notOk(await hasSelector(page, "#frame form.reject"), "replaces entire page")
})

test("test submitter form submission reads button attributes", async ({ page }) => {
  const button = await page.locator("#submitter form button[type=submit][formmethod=post]")
  await button.click()
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/two.html")
  assert.equal(await visitAction(page), "advance")
})

test("test submitter POST form submission with multipart/form-data formenctype", async ({ page }) => {
  await page.click("#submitter form[method=post]:not([enctype]) input[formenctype]")
  await nextBeat()

  const enctype = getSearchParam(page.url(), "enctype")
  assert.ok(enctype?.startsWith("multipart/form-data"), "submits a multipart/form-data request")
})

test("test submitter GET submission from submitter with data-turbo-frame", async ({ page }) => {
  await page.click("#submitter form[method=get] [type=submit][data-turbo-frame]")
  await nextBeat()

  const message = await page.locator("#frame div.message")
  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Form")
  assert.equal(await message.textContent(), "Frame redirected")
})

test("test submitter POST submission from submitter with data-turbo-frame", async ({ page }) => {
  await page.click("#submitter form[method=post] [type=submit][data-turbo-frame]")
  await nextBeat()

  const message = await page.locator("#frame div.message")
  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Form")
  assert.equal(await message.textContent(), "Frame redirected")
})

test("test frame form GET submission from submitter with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#frame form[method=get] [type=submit][data-turbo-frame=_top]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "One")
})

test("test frame form POST submission from submitter with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#frame form[method=post] [type=submit][data-turbo-frame=_top]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "One")
})

test("test frame POST form targetting frame submission", async ({ page }) => {
  await page.click("#targets-frame-post-form-submit")

  assert.ok(await formSubmitStarted(page), "fires turbo:submit-start")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
  assert.equal("frame", fetchOptions.headers["Turbo-Frame"])

  await nextEventNamed(page, "turbo:before-fetch-response")

  assert.ok(await formSubmitEnded(page), "fires turbo:submit-end")

  await nextEventNamed(page, "turbo:frame-render")
  await nextEventNamed(page, "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, 0, "no more events")

  const src = (await page.getAttribute("#frame", "src")) || ""
  assert.equal(new URL(src).pathname, "/src/tests/fixtures/frames/frame.html")
})

test("test frame POST form targetting frame toggles submitter's [disabled] attribute", async ({ page }) => {
  await page.click("#targets-frame-post-form-submit")

  assert.equal(
    await nextAttributeMutationNamed(page, "targets-frame-post-form-submit", "disabled"),
    "",
    "sets [disabled] on the submitter"
  )
  assert.equal(
    await nextAttributeMutationNamed(page, "targets-frame-post-form-submit", "disabled"),
    null,
    "removes [disabled] from the submitter"
  )
})

test("test frame GET form targetting frame submission", async ({ page }) => {
  await page.click("#targets-frame-get-form-submit")

  assert.ok(await formSubmitStarted(page), "fires turbo:submit-start")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.notOk(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
  assert.equal("frame", fetchOptions.headers["Turbo-Frame"])

  await nextEventNamed(page, "turbo:before-fetch-response")

  assert.ok(await formSubmitEnded(page), "fires turbo:submit-end")

  await nextEventNamed(page, "turbo:frame-render")
  await nextEventNamed(page, "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, 0, "no more events")

  const src = (await page.getAttribute("#frame", "src")) || ""
  assert.equal(new URL(src).pathname, "/src/tests/fixtures/frames/frame.html")
})

test("test frame GET form targetting frame toggles submitter's [disabled] attribute", async ({ page }) => {
  await page.click("#targets-frame-get-form-submit")

  assert.equal(
    await nextAttributeMutationNamed(page, "targets-frame-get-form-submit", "disabled"),
    "",
    "sets [disabled] on the submitter"
  )
  assert.equal(
    await nextAttributeMutationNamed(page, "targets-frame-get-form-submit", "disabled"),
    null,
    "removes [disabled] from the submitter"
  )
})

test("test frame form GET submission from submitter referencing another frame", async ({ page }) => {
  await page.click("#frame form[method=get] [type=submit][data-turbo-frame=hello]")
  await nextBeat()

  const title = await page.locator("h1")
  const frameTitle = await page.locator("#hello h2")
  assert.equal(await frameTitle.textContent(), "Hello from a frame")
  assert.equal(await title.textContent(), "Form")
})

test("test frame form POST submission from submitter referencing another frame", async ({ page }) => {
  await page.click("#frame form[method=post] [type=submit][data-turbo-frame=hello]")
  await nextBeat()

  const title = await page.locator("h1")
  const frameTitle = await page.locator("#hello h2")
  assert.equal(await frameTitle.textContent(), "Hello from a frame")
  assert.equal(await title.textContent(), "Form")
})

test("test frame form submission with redirect response", async ({ page }) => {
  const path = (await page.getAttribute("#frame form.redirect input[name=path]", "value")) || ""
  const url = new URL(path, "http://localhost:9000")
  url.searchParams.set("enctype", "application/x-www-form-urlencoded;charset=UTF-8")

  const button = await page.locator("#frame form.redirect input[type=submit]")
  await button.click()
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const message = await page.locator("#frame div.message")
  assert.notOk(await hasSelector(page, "#frame form.redirect"))
  assert.equal(await message.textContent(), "Frame redirected")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html", "does not redirect _top")
  assert.notOk(search(page.url()), "does not redirect _top")
  assert.equal(await page.getAttribute("#frame", "src"), url.href, "redirects the target frame")
})

test("test frame form submission toggles the ancestor frame's [aria-busy] attribute", async ({ page }) => {
  await page.click("#frame form.redirect input[type=submit]")
  await nextBeat()

  assert.equal(await nextAttributeMutationNamed(page, "frame", "busy"), "", "sets [busy] on the #frame")
  assert.equal(await nextAttributeMutationNamed(page, "frame", "aria-busy"), "true", "sets [aria-busy] on the #frame")
  assert.equal(await nextAttributeMutationNamed(page, "frame", "busy"), null, "removes [busy] from the #frame")
  assert.equal(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    null,
    "removes [aria-busy] from the #frame"
  )
})

test("test frame form submission toggles the target frame's [aria-busy] attribute", async ({ page }) => {
  await page.click('#targets-frame form.frame [type="submit"]')
  await nextBeat()

  assert.equal(await nextAttributeMutationNamed(page, "frame", "busy"), "", "sets [busy] on the #frame")
  assert.equal(await nextAttributeMutationNamed(page, "frame", "aria-busy"), "true", "sets [aria-busy] on the #frame")

  const title = await page.locator("#frame h2")
  assert.equal(await title.textContent(), "Frame: Loaded")
  assert.equal(await nextAttributeMutationNamed(page, "frame", "busy"), null, "removes [busy] from the #frame")
  assert.equal(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    null,
    "removes [aria-busy] from the #frame"
  )
})

test("test frame form submission with empty created response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "#frame")
  const button = await page.locator("#frame form.created input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "#frame")
  assert.equal(htmlAfter, htmlBefore)
})

test("test frame form submission with empty no-content response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "#frame")
  const button = await page.locator("#frame form.no-content input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "#frame")
  assert.equal(htmlAfter, htmlBefore)
})

test("test frame form submission within a frame submits the Turbo-Frame header", async ({ page }) => {
  await page.click("#frame form.redirect input[type=submit]")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header")
})

test("test invalid frame form submission with unprocessable entity status", async ({ page }) => {
  await page.click("#frame form.unprocessable_entity input[type=submit]")

  assert.ok(await formSubmitStarted(page), "fires turbo:submit-start")
  await nextEventNamed(page, "turbo:before-fetch-request")
  await nextEventNamed(page, "turbo:before-fetch-response")
  assert.ok(await formSubmitEnded(page), "fires turbo:submit-end")
  await nextEventNamed(page, "turbo:frame-render")
  await nextEventNamed(page, "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, 0, "no more events")

  const title = await page.locator("#frame h2")
  assert.ok(await hasSelector(page, "#reject form"), "only replaces frame")
  assert.equal(await title.textContent(), "Frame: Unprocessable Entity")
})

test("test invalid frame form submission with internal server errror status", async ({ page }) => {
  await page.click("#frame form.internal_server_error input[type=submit]")

  assert.ok(await formSubmitStarted(page), "fires turbo:submit-start")
  await nextEventNamed(page, "turbo:before-fetch-request")
  await nextEventNamed(page, "turbo:before-fetch-response")
  assert.ok(await formSubmitEnded(page), "fires turbo:submit-end")
  await nextEventNamed(page, "turbo:frame-render")
  await nextEventNamed(page, "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  assert.equal(otherEvents.length, 0, "no more events")

  assert.ok(await hasSelector(page, "#reject form"), "only replaces frame")
  assert.equal(await page.textContent("#frame h2"), "Frame: Internal Server Error")
})

test("test frame form submission with stream response", async ({ page }) => {
  const button = await page.locator("#frame form.stream[method=post] input[type=submit]")
  await button.click()
  await nextBeat()

  const message = await page.locator("#frame div.message")
  assert.ok(await hasSelector(page, "#frame form.redirect"))
  assert.equal(await message.textContent(), "Hello!")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.notOk(await page.getAttribute("#frame", "src"), "does not change frame's src")
})

test("test frame form submission with HTTP verb other than GET or POST", async ({ page }) => {
  await page.click("#frame form.put.stream input[type=submit]")
  await nextBeat()

  assert.ok(await hasSelector(page, "#frame form.redirect"))
  assert.equal(await page.textContent("#frame div.message"), "1: Hello!")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
})

test("test frame form submission with [data-turbo=false] on the form", async ({ page }) => {
  await page.click('#frame form[data-turbo="false"] input[type=submit]')
  await waitUntilSelector(page, "#element-id")

  assert.notOk(await formSubmitStarted(page))
})

test("test frame form submission with [data-turbo=false] on the submitter", async ({ page }) => {
  await page.click('#frame form:not([data-turbo]) input[data-turbo="false"]')
  await waitUntilSelector(page, "#element-id")

  assert.notOk(await formSubmitStarted(page))
})

test("test frame form submission ignores submissions with their defaultPrevented", async ({ page }) => {
  await page.evaluate(() => document.addEventListener("submit", (event) => event.preventDefault(), true))
  await page.click("#frame .redirect [type=submit]")
  await nextBeat()

  assert.equal(await page.textContent("#frame h2"), "Frame: Form")
  assert.equal(await page.getAttribute("#frame", "src"), null, "does not navigate frame")
})

test("test form submission with [data-turbo=false] on the form", async ({ page }) => {
  await page.click('#turbo-false form[data-turbo="false"] input[type=submit]')
  await waitUntilSelector(page, "#element-id")

  assert.notOk(await formSubmitStarted(page))
})

test("test form submission with [data-turbo=false] on the submitter", async ({ page }) => {
  await page.click('#turbo-false form:not([data-turbo]) input[data-turbo="false"]')
  await waitUntilSelector(page, "#element-id")

  assert.notOk(await formSubmitStarted(page))
})

test("test form submission skipped within method=dialog", async ({ page }) => {
  await page.click('#dialog-method [type="submit"]')
  await nextBeat()

  assert.notOk(await formSubmitStarted(page))
})

test("test form submission skipped with submitter formmethod=dialog", async ({ page }) => {
  await page.click('#dialog-formmethod-turbo-frame [formmethod="dialog"]')
  await nextBeat()

  assert.notOk(await formSubmitEnded(page))
})

test("test form submission targetting frame skipped within method=dialog", async ({ page }) => {
  await page.click("#dialog-method-turbo-frame button")
  await nextBeat()

  assert.notOk(await formSubmitEnded(page))
})

test("test form submission targetting frame skipped with submitter formmethod=dialog", async ({ page }) => {
  await page.click('#dialog-formmethod [formmethod="dialog"]')
  await nextBeat()

  assert.notOk(await formSubmitStarted(page))
})

test("test form submission targets disabled frame", async ({ page }) => {
  await page.evaluate(() => document.getElementById("frame")?.setAttribute("disabled", ""))
  await page.click('#targets-frame form.one [type="submit"]')
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
})

test("test form submission targeting a frame submits the Turbo-Frame header", async ({ page }) => {
  await page.click('#targets-frame [type="submit"]')

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header")
})

test("test link method form submission submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#stream-link-method-within-form-outside-frame")
  await nextBeat()

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  await noNextEventNamed(page, "turbo:before-fetch-request")

  assert.equal(fetchOptions.method, "POST", "[data-turbo-method] overrides the GET method")
  assert.equal(requestCounter, 1, "submits a single HTTP request")
})

test("test link method form submission inside frame submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#stream-link-method-inside-frame")
  await nextBeat()

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")
  await noNextEventNamed(page, "turbo:before-fetch-request")

  assert.equal(fetchOptions.method, "POST", "[data-turbo-method] overrides the GET method")
  assert.equal(requestCounter, 1, "submits a single HTTP request")
})

test("test link method form submission targetting frame submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#turbo-method-post-to-targeted-frame")
  await nextBeat()

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")
  await noNextEventNamed(page, "turbo:before-fetch-request")

  assert.equal(fetchOptions.method, "POST", "[data-turbo-method] overrides the GET method")
  assert.equal(requestCounter, 2, "submits a single HTTP request then follows a redirect")
})

test("test link method form submission inside frame", async ({ page }) => {
  await page.click("#link-method-inside-frame")
  await nextBeat()

  assert.equal(await page.textContent("#frame h2"), "Frame: Loaded")
  assert.notOk(await hasSelector(page, "#nested-child"))
})

test("test link method form submission inside frame with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#link-method-inside-frame-target-top")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Hello")
})

test("test link method form submission inside frame with data-turbo-frame target", async ({ page }) => {
  await page.click("#link-method-inside-frame-with-target")
  await nextBeat()

  const title = await page.locator("h1")
  const frameTitle = await page.locator("#hello h2")
  assert.equal(await frameTitle.textContent(), "Hello from a frame")
  assert.equal(await title.textContent(), "Form")
})

test("test stream link method form submission inside frame", async ({ page }) => {
  await page.click("#stream-link-method-inside-frame")
  await nextBeat()

  const message = page.locator("#frame div.message")
  assert.equal(await message.textContent(), "Link!")
})

test("test stream link GET method form submission inside frame", async ({ page }) => {
  await page.click("#stream-link-get-method-inside-frame")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
})

test("test stream link inside frame", async ({ page }) => {
  await page.click("#stream-link-inside-frame")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
})

test("test stream link outside frame", async ({ page }) => {
  await page.click("#stream-link-outside-frame")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
})

test("test link method form submission within form inside frame", async ({ page }) => {
  await page.click("#stream-link-method-within-form-inside-frame")
  await nextBeat()

  const message = page.locator("#frame div.message")
  assert.equal(await message.textContent(), "Link!")
})

test("test link method form submission inside frame with confirmation confirmed", async ({ page }) => {
  page.on("dialog", (dialog) => {
    assert.equal(dialog.message(), "Are you sure?")
    dialog.accept()
  })

  await page.click("#link-method-inside-frame-with-confirmation")
  await nextBeat()

  const message = page.locator("#frame div.message")
  assert.equal(await message.textContent(), "Link!")
})

test("test link method form submission inside frame with confirmation cancelled", async ({ page }) => {
  page.on("dialog", (dialog) => {
    assert.equal(dialog.message(), "Are you sure?")
    dialog.dismiss()
  })

  await page.click("#link-method-inside-frame-with-confirmation")
  await nextBeat()

  assert.notOk(await hasSelector(page, "#frame div.message"), "Not confirming form submission does not submit the form")
})

test("test link method form submission outside frame", async ({ page }) => {
  await page.click("#link-method-outside-frame")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Hello")
})

test("test following a link with [data-turbo-method] set and a target set navigates the target frame", async ({
  page,
}) => {
  await page.click("#turbo-method-post-to-targeted-frame")

  assert.equal(await page.textContent("#hello h2"), "Hello from a frame", "drives the turbo-frame")
})

test("test following a link with [data-turbo-method] and [data-turbo=true] set when html[data-turbo=false]", async ({
  page,
}) => {
  const html = await page.locator("html")
  await html.evaluate((html) => html.setAttribute("data-turbo", "false"))

  const link = await page.locator("#turbo-method-post-to-targeted-frame")
  await link.evaluate((link) => link.setAttribute("data-turbo", "true"))

  await link.click()

  assert.equal(await page.textContent("h1"), "Form", "does not navigate the full page")
  assert.equal(await page.textContent("#hello h2"), "Hello from a frame", "drives the turbo-frame")
})

test("test following a link with [data-turbo-method] and [data-turbo=true] set when Turbo.session.drive = false", async ({
  page,
}) => {
  await page.evaluate(() => (window.Turbo.session.drive = false))

  const link = await page.locator("#turbo-method-post-to-targeted-frame")
  await link.evaluate((link) => link.setAttribute("data-turbo", "true"))

  await link.click()

  assert.equal(await page.textContent("h1"), "Form", "does not navigate the full page")
  assert.equal(await page.textContent("#hello h2"), "Hello from a frame", "drives the turbo-frame")
})

test("test following a link with [data-turbo-method] set when html[data-turbo=false]", async ({ page }) => {
  const html = await page.locator("html")
  await html.evaluate((html) => html.setAttribute("data-turbo", "false"))

  await page.click("#turbo-method-post-to-targeted-frame")

  assert.equal(await page.textContent("h1"), "Hello", "treats link as a full-page navigation")
})

test("test following a link with [data-turbo-method] set when Turbo.session.drive = false", async ({ page }) => {
  await page.evaluate(() => (window.Turbo.session.drive = false))
  await page.click("#turbo-method-post-to-targeted-frame")

  assert.equal(await page.textContent("h1"), "Hello", "treats link as a full-page navigation")
})

test("test stream link method form submission outside frame", async ({ page }) => {
  await page.click("#stream-link-method-outside-frame")
  await nextBeat()

  const message = page.locator("#frame div.message")
  assert.equal(await message.textContent(), "Link!")
})

test("test link method form submission within form outside frame", async ({ page }) => {
  await page.click("#link-method-within-form-outside-frame")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Hello")
})

test("test stream link method form submission within form outside frame", async ({ page }) => {
  await page.click("#stream-link-method-within-form-outside-frame")
  await nextBeat()

  assert.equal(await page.textContent("#frame div.message"), "Link!")
})

test("test form submission with form mode off", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setFormMode("off"))
  await page.click("#standard form.turbo-enabled input[type=submit]")

  assert.notOk(await formSubmitStarted(page))
})

test("test form submission with form mode optin and form not enabled", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setFormMode("optin"))
  await page.click("#standard form.redirect input[type=submit]")

  assert.notOk(await formSubmitStarted(page))
})

test("test form submission with form mode optin and form enabled", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setFormMode("optin"))
  await page.click("#standard form.turbo-enabled input[type=submit]")

  assert.ok(await formSubmitStarted(page))
})

test("test form submission with form mode optin and form enabled from submitter outside form", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setFormMode("optin"))
  await page.click("#standard button[form=turbo-enabled-form]")

  assert.ok(await formSubmitStarted(page))
})

test("test turbo:before-fetch-request fires on the form element", async ({ page }) => {
  await page.click('#targets-frame form.one [type="submit"]')
  assert.ok(await nextEventOnTarget(page, "form_one", "turbo:before-fetch-request"))
})

test("test turbo:before-fetch-response fires on the form element", async ({ page }) => {
  await page.click('#targets-frame form.one [type="submit"]')
  assert.ok(await nextEventOnTarget(page, "form_one", "turbo:before-fetch-response"))
})

test("test POST to external action ignored", async ({ page }) => {
  await page.click("#submit-external")
  await noNextEventNamed(page, "turbo:before-fetch-request")
  await nextBody(page)

  assert.equal(page.url(), "https://httpbin.org/post")
})

test("test POST to external action within frame ignored", async ({ page }) => {
  await page.click("#submit-external-within-ignored")
  await noNextEventNamed(page, "turbo:before-fetch-request")
  await nextBody(page)

  assert.equal(page.url(), "https://httpbin.org/post")
})

test("test POST to external action targetting frame ignored", async ({ page }) => {
  await page.click("#submit-external-target-ignored")
  await noNextEventNamed(page, "turbo:before-fetch-request")
  await nextBody(page)

  assert.equal(page.url(), "https://httpbin.org/post")
})

test("test form submission skipped with form[target]", async ({ page }) => {
  await page.click("#skipped form[target] button")
  await nextBeat()

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.notOk(await formSubmitEnded(page))
})

test("test form submission skipped with submitter button[formtarget]", async ({ page }) => {
  await page.click("#skipped [formtarget]")
  await nextBeat()

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.notOk(await formSubmitEnded(page))
})

function formSubmitStarted(page: Page) {
  return getFromLocalStorage(page, "formSubmitStarted")
}

function formSubmitEnded(page: Page) {
  return getFromLocalStorage(page, "formSubmitEnded")
}
