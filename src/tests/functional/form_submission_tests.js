import { test } from "@playwright/test"
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
  waitUntilNoSelector
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html")
  await setLocalStorageFromEvent(page, "turbo:submit-start", "formSubmitStarted", "true")
  await setLocalStorageFromEvent(page, "turbo:submit-end", "formSubmitEnded", "true")
  await readEventLogs(page)
})

test("standard form submission renders a progress bar", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setProgressBarDelay(0))
  await page.click("#standard form.sleep input[type=submit]")

  await waitUntilSelector(page, ".turbo-progress-bar")
  assert.ok(await hasSelector(page, ".turbo-progress-bar"), "displays progress bar")

  await nextBody(page)
  await waitUntilNoSelector(page, ".turbo-progress-bar")

  assert.notOk(await hasSelector(page, ".turbo-progress-bar"), "hides progress bar")
})

test("form submission with confirmation confirmed", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Are you sure?")
    alert.accept()
  })

  await page.click("#standard form.confirm input[type=submit]")

  await nextEventNamed(page, "turbo:load")
  assert.ok(await formSubmitStarted(page))
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
})

test("form submission with confirmation cancelled", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Are you sure?")
    alert.dismiss()
  })
  await page.click("#standard form.confirm input[type=submit]")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission with secondary submitter click - confirmation confirmed", async ({ page }) => {
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

test("form submission with secondary submitter click - confirmation cancelled", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Are you really sure?")
    alert.dismiss()
  })

  await page.click("#standard form.confirm #secondary_submitter")

  assert.notOk(await formSubmitStarted(page))
})

test("from submission with confirmation overridden", async ({ page }) => {
  page.on("dialog", (alert) => {
    assert.equal(alert.message(), "Overridden message")
    alert.accept()
  })

  await page.evaluate(() => window.Turbo.setConfirmMethod(() => Promise.resolve(confirm("Overridden message"))))
  await page.click("#standard form.confirm input[type=submit]")

  assert.ok(await formSubmitStarted(page))
})

test("standard form submission does not render a progress bar before expiring the delay", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setProgressBarDelay(500))
  await page.click("#standard form.redirect input[type=submit]")

  assert.notOk(await hasSelector(page, ".turbo-progress-bar"), "does not show progress bar before delay")
})

test("standard POST form submission with redirect response", async ({ page }) => {
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

test("standard POST form submission events", async ({ page }) => {
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

test("supports transforming a POST submission to a GET in a turbo:submit-start listener", async ({ page }) => {
  await page.evaluate(() =>
    addEventListener("turbo:submit-start", (({ detail }) => {
      detail.formSubmission.method = "get"
      detail.formSubmission.action = "/src/tests/fixtures/one.html"
      detail.formSubmission.body.set("greeting", "Hello, from an event listener")
    }))
  )
  await page.click("#standard form[method=post] [type=submit]")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "One", "overrides the method and action")
  assert.equal(getSearchParam(page.url(), "greeting"), "Hello, from an event listener")
})

test("supports transforming a GET submission to a POST in a turbo:submit-start listener", async ({ page }) => {
  await page.evaluate(() =>
    addEventListener("turbo:submit-start", (({ detail }) => {
      detail.formSubmission.method = "post"
      detail.formSubmission.body.set("path", "/src/tests/fixtures/one.html")
      detail.formSubmission.body.set("greeting", "Hello, from an event listener")
    }))
  )
  await page.click("#standard form[method=get] [type=submit]")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "One", "overrides the method and action")
  assert.equal(getSearchParam(page.url(), "greeting"), "Hello, from an event listener")
})

test("supports modifying the submission in a turbo:before-fetch-request listener", async ({ page }) => {
  await page.evaluate(() =>
    addEventListener("turbo:before-fetch-request", (({ detail }) => {
      detail.url = new URL("/src/tests/fixtures/one.html", document.baseURI)
      detail.url.search = new URLSearchParams(detail.fetchOptions.body).toString()
      detail.fetchOptions.body = null
      detail.fetchOptions.method = "get"
    }))
  )
  await page.click("#standard form[method=post] [type=submit]")
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "One", "overrides the method and action")
  assert.equal(getSearchParam(page.url(), "greeting"), "Hello from a redirect")
})

test("standard POST form submission merges values from both searchParams and body", async ({ page }) => {
  await page.click("#form-action-post-redirect-self-q-b")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "q"), "b")
  assert.equal(getSearchParam(page.url(), "sort"), "asc")
})

test("standard POST form submission toggles submitter [disabled] attribute", async ({ page }) => {
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

test("replaces input value with data-turbo-submits-with on form submission", async ({ page }) => {
  page.click("#submits-with-form-input")

  assert.equal(
    await nextAttributeMutationNamed(page, "submits-with-form-input", "value"),
    "Saving...",
    "sets data-turbo-submits-with on the submitter"
  )

  assert.equal(
    await nextAttributeMutationNamed(page, "submits-with-form-input", "value"),
    "Save",
    "restores the original submitter text value"
  )
})

test("replaces button innerHTML with data-turbo-submits-with on form submission", async ({ page }) => {
  await page.click("#submits-with-form-button")

  await nextEventNamed(page, "turbo:submit-start")
  assert.equal(
    await page.textContent("#submits-with-form-button"),
    "Saving...",
    "sets data-turbo-submits-with on the submitter"
  )

  await nextEventNamed(page, "turbo:submit-end")
  assert.equal(
    await page.textContent("#submits-with-form-button"),
    "Save",
    "sets data-turbo-submits-with on the submitter"
  )
})

test("standard GET form submission", async ({ page }) => {
  await page.click("#standard form.greeting input[type=submit]")
  await nextBody(page)

  assert.ok(await formSubmitStarted(page))
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await visitAction(page), "advance")
  assert.equal(getSearchParam(page.url(), "greeting"), "Hello from a form")
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

test("standard GET HTMLFormElement.requestSubmit() with Turbo Action", async ({ page }) => {
  await page.evaluate(() => {
    const formControl = document.querySelector("#external-select")

    if (formControl && formControl.form) formControl.form.requestSubmit()
  })
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "Form", "Retains original page state")
  assert.equal(await page.textContent("#hello h2"), "Hello from a frame", "navigates #hello turbo frame")
  assert.equal(await visitAction(page), "replace", "reads Turbo Action from <form>")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/hello.html", "promotes frame navigation to page Visit")
  assert.equal(getSearchParam(page.url(), "greeting"), "Hello from a replace Visit", "encodes <form> into request")
})

test("GET HTMLFormElement.requestSubmit() triggered by javascript", async ({ page }) => {
  await page.click("#request-submit-trigger")

  await nextEventNamed(page, "turbo:load")

  assert.notEqual(pathname(page.url()), "/src/tests/fixtures/one.html", "SubmitEvent was triggered without a submitter")
  assert.equal(await page.textContent("#hello h2"), "Hello from a frame", "navigates #hello turbo frame")
})

test("standard GET form submission with [data-turbo-stream] declared on the form", async ({ page }) => {
  await page.click("#standard-get-form-with-stream-opt-in-submit")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
})

test("standard GET form submission with [data-turbo-stream] declared on submitter", async ({ page }) => {
  await page.click("#standard-get-form-with-stream-opt-in-submitter")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
})

test("standard GET form submission events", async ({ page }) => {
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

test("standard GET form submission does not incorporate the current page's URLSearchParams values into the submission", async ({
  page
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

test("standard GET form submission does not merge values into the [action] attribute", async ({ page }) => {
  await page.click("#form-action-self-sort")
  await nextBody(page)

  assert.equal(await pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(await search(page.url()), "?sort=asc")

  await page.click("#form-action-self-q-b")
  await nextBody(page)

  assert.equal(await pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(await search(page.url()), "?q=b", "navigates without omitted keys")
})

test("standard GET form submission omits the [action] value's URLSearchParams from the submission", async ({
  page
}) => {
  await page.click("#form-action-self-submit")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(search(page.url()), "")
})

test("standard GET form submission toggles submitter [disabled] attribute", async ({ page }) => {
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

test("standard GET form submission appending keys", async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html?query=1")
  await page.click("#standard form.conflicting-values input[type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "query"), "2")
})

test("standard form submission with empty created response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "body")
  const button = await page.locator("#standard form.created input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "body")
  assert.equal(htmlAfter, htmlBefore)
})

test("standard form submission with empty no-content response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "body")
  const button = await page.locator("#standard form.no-content input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "body")
  assert.equal(htmlAfter, htmlBefore)
})

test("standard POST form submission with multipart/form-data enctype", async ({ page }) => {
  await page.click("#standard form[method=post][enctype] input[type=submit]")
  await nextBeat()

  const enctype = getSearchParam(page.url(), "enctype")
  assert.ok(enctype?.startsWith("multipart/form-data"), "submits a multipart/form-data request")
})

test("standard GET form submission ignores enctype", async ({ page }) => {
  await page.click("#standard form[method=get][enctype] input[type=submit]")
  await nextBeat()

  const enctype = getSearchParam(page.url(), "enctype")
  assert.notOk(enctype, "GET form submissions ignore enctype")
})

test("standard POST form submission without an enctype", async ({ page }) => {
  await page.click("#standard form[method=post].no-enctype input[type=submit]")
  await nextBeat()

  const enctype = getSearchParam(page.url(), "enctype")
  assert.ok(
    enctype?.startsWith("application/x-www-form-urlencoded"),
    "submits a application/x-www-form-urlencoded request"
  )
})

test("no-action form submission with single parameter", async ({ page }) => {
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

test("no-action form submission with multiple parameters", async ({ page }) => {
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

test("no-action form submission submitter parameters", async ({ page }) => {
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

test("submitter with blank formaction submits to the current page", async ({ page }) => {
  await page.click("#blank-formaction button")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.ok(await hasSelector(page, "#blank-formaction"), "overrides form[action] navigation")
})

test("input named action with no action attribute", async ({ page }) => {
  await page.click("#action-input form.no-action [type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.equal(getSearchParam(page.url(), "action"), "1")
  assert.equal(getSearchParam(page.url(), "query"), "1")
})

test("input named action with action attribute", async ({ page }) => {
  await page.click("#action-input form.action [type=submit]")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(getSearchParam(page.url(), "action"), "1")
  assert.equal(getSearchParam(page.url(), "query"), "1")
})

test("invalid form submission with unprocessable entity status", async ({ page }) => {
  await page.click("#reject form.unprocessable_entity input[type=submit]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Unprocessable Entity", "renders the response HTML")
  assert.notOk(await hasSelector(page, "#frame form.reject"), "replaces entire page")
})

test("invalid form submission with long form", async ({ page }) => {
  await scrollToSelector(page, "#reject form.unprocessable_entity_with_tall_form input[type=submit]")
  await page.click("#reject form.unprocessable_entity_with_tall_form input[type=submit]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Unprocessable Entity", "renders the response HTML")
  assert(await isScrolledToTop(page), "page is scrolled to the top")
  assert.notOk(await hasSelector(page, "#frame form.reject"), "replaces entire page")
})

test("invalid form submission with server error status", async ({ page }) => {
  assert(await hasSelector(page, "head > #form-fixture-styles"))
  await page.click("#reject form.internal_server_error input[type=submit]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Internal Server Error", "renders the response HTML")
  assert.notOk(await hasSelector(page, "head > #form-fixture-styles"), "replaces head")
  assert.notOk(await hasSelector(page, "#frame form.reject"), "replaces entire page")
})

test("form submission with network error", async ({ page }) => {
  await page.context().setOffline(true)
  await page.click("#reject-form [type=submit]")
  await nextEventOnTarget(page, "reject-form", "turbo:fetch-request-error")
})

test("submitter form submission reads button attributes", async ({ page }) => {
  const button = await page.locator("#submitter form button[type=submit][formmethod=post]")
  await button.click()
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/two.html")
  assert.equal(await visitAction(page), "advance")
})

test("submitter POST form submission with multipart/form-data formenctype", async ({ page }) => {
  await page.click("#submitter form[method=post]:not([enctype]) input[formenctype]")
  await nextBeat()

  const enctype = getSearchParam(page.url(), "enctype")
  assert.ok(enctype?.startsWith("multipart/form-data"), "submits a multipart/form-data request")
})

test("submitter GET submission from submitter with data-turbo-frame", async ({ page }) => {
  await page.click("#submitter form[method=get] [type=submit][data-turbo-frame]")
  await nextBeat()

  const message = await page.locator("#frame div.message")
  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Form")
  assert.equal(await message.textContent(), "Frame redirected")
})

test("submitter POST submission from submitter with data-turbo-frame", async ({ page }) => {
  await page.click("#submitter form[method=post] [type=submit][data-turbo-frame]")
  await nextBeat()

  const message = await page.locator("#frame div.message")
  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Form")
  assert.equal(await message.textContent(), "Frame redirected")
})

test("form[data-turbo-frame=_top] submission", async ({ page }) => {
  const form = await page.locator("#standard form.redirect[data-turbo-frame=_top]")

  await form.locator("button").click()
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "One")
})

test("form[data-turbo-frame=_top] submission within frame", async ({ page }) => {
  const frame = await page.locator("turbo-frame#frame")
  const form = await frame.locator("form.redirect[data-turbo-frame=_top]")

  await form.locator("button").click()
  await nextEventNamed(page, "turbo:load")

  assert.equal(await page.textContent("h1"), "Frames: Form")
})

test("frame form GET submission from submitter with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#frame form[method=get] [type=submit][data-turbo-frame=_top]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "One")
})

test("frame form POST submission from submitter with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#frame form[method=post] [type=submit][data-turbo-frame=_top]")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "One")
})

test("frame POST form targeting frame submission", async ({ page }) => {
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

test("frame POST form targeting frame toggles submitter's [disabled] attribute", async ({ page }) => {
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

test("frame GET form targeting frame submission", async ({ page }) => {
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

test("frame GET form targeting frame toggles submitter's [disabled] attribute", async ({ page }) => {
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

test("frame form GET submission from submitter referencing another frame", async ({ page }) => {
  await page.click("#frame form[method=get] [type=submit][data-turbo-frame=hello]")
  await nextBeat()

  const title = await page.locator("h1")
  const frameTitle = await page.locator("#hello h2")
  assert.equal(await frameTitle.textContent(), "Hello from a frame")
  assert.equal(await title.textContent(), "Form")
})

test("frame form POST submission from submitter referencing another frame", async ({ page }) => {
  await page.click("#frame form[method=post] [type=submit][data-turbo-frame=hello]")
  await nextBeat()

  const title = await page.locator("h1")
  const frameTitle = await page.locator("#hello h2")
  assert.equal(await frameTitle.textContent(), "Hello from a frame")
  assert.equal(await title.textContent(), "Form")
})

test("frame form submission with redirect response", async ({ page }) => {
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

test("frame POST form submission toggles the ancestor frame's [aria-busy] attribute", async ({ page }) => {
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

test("frame POST form submission toggles the target frame's [aria-busy] attribute", async ({ page }) => {
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

test("frame form submission with empty created response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "#frame")
  const button = await page.locator("#frame form.created input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "#frame")
  assert.equal(htmlAfter, htmlBefore)
})

test("frame form submission with empty no-content response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "#frame")
  const button = await page.locator("#frame form.no-content input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "#frame")
  assert.equal(htmlAfter, htmlBefore)
})

test("frame form submission within a frame submits the Turbo-Frame header", async ({ page }) => {
  await page.click("#frame form.redirect input[type=submit]")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header")
})

test("invalid frame form submission with unprocessable entity status", async ({ page }) => {
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

test("invalid frame form submission with internal server error status", async ({ page }) => {
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

test("frame form submission with stream response", async ({ page }) => {
  const button = await page.locator("#frame form.stream[method=post] input[type=submit]")
  await button.click()
  await nextBeat()

  const message = await page.locator("#frame div.message")
  assert.ok(await hasSelector(page, "#frame form.redirect"))
  assert.equal(await message.textContent(), "Hello!")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.notOk(await page.getAttribute("#frame", "src"), "does not change frame's src")
})

test("frame form submission with HTTP verb other than GET or POST", async ({ page }) => {
  await page.click("#frame form.put.stream input[type=submit]")
  await nextBeat()

  assert.ok(await hasSelector(page, "#frame form.redirect"))
  assert.equal(await page.textContent("#frame div.message"), "1: Hello!")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
})

test("frame form submission with [data-turbo=false] on the form", async ({ page }) => {
  await page.click('#frame form[data-turbo="false"] input[type=submit]')
  await waitUntilSelector(page, "#element-id")

  assert.notOk(await formSubmitStarted(page))
})

test("frame form submission with [data-turbo=false] on the submitter", async ({ page }) => {
  await page.click('#frame form:not([data-turbo]) input[data-turbo="false"]')
  await waitUntilSelector(page, "#element-id")

  assert.notOk(await formSubmitStarted(page))
})

test("frame form submission ignores submissions with their defaultPrevented", async ({ page }) => {
  await page.evaluate(() => document.addEventListener("submit", (event) => event.preventDefault(), true))
  await page.click("#frame .redirect [type=submit]")
  await nextBeat()

  assert.equal(await page.textContent("#frame h2"), "Frame: Form")
  assert.equal(await page.getAttribute("#frame", "src"), null, "does not navigate frame")
})

test("form submission with [data-turbo=false] on the form", async ({ page }) => {
  await page.click('#turbo-false form[data-turbo="false"] input[type=submit]')
  await waitUntilSelector(page, "#element-id")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission with [data-turbo=false] on the submitter", async ({ page }) => {
  await page.click('#turbo-false form:not([data-turbo]) input[data-turbo="false"]')
  await waitUntilSelector(page, "#element-id")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission skipped within method=dialog", async ({ page }) => {
  await page.click('#dialog-method [type="submit"]')
  await nextBeat()

  assert.notOk(await formSubmitStarted(page))
})

test("form submission skipped with submitter formmethod=dialog", async ({ page }) => {
  await page.click('#dialog-formmethod-turbo-frame [formmethod="dialog"]')
  await nextBeat()

  assert.notOk(await formSubmitEnded(page))
})

test("form submission targeting frame skipped within method=dialog", async ({ page }) => {
  await page.click("#dialog-method-turbo-frame button")
  await nextBeat()

  assert.notOk(await formSubmitEnded(page))
})

test("form submission targeting frame skipped with submitter formmethod=dialog", async ({ page }) => {
  await page.click('#dialog-formmethod [formmethod="dialog"]')
  await nextBeat()

  assert.notOk(await formSubmitStarted(page))
})

test("form submission targets disabled frame", async ({ page }) => {
  await page.evaluate(() => document.getElementById("frame")?.setAttribute("disabled", ""))
  await page.click('#targets-frame form.one [type="submit"]')
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
})

test("form submission targeting a frame submits the Turbo-Frame header", async ({ page }) => {
  await page.click('#targets-frame [type="submit"]')

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header")
})

test("link method form submission dispatches events from a connected <form> element", async ({ page }) => {
  await page.evaluate(() =>
    new MutationObserver(([record]) => {
      for (const form of record.addedNodes) {
        if (form instanceof HTMLFormElement) form.id = "a-form-link"
      }
    }).observe(document.body, { childList: true })
  )

  await page.click("#stream-link-method-within-form-outside-frame")
  await nextEventOnTarget(page, "a-form-link", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "a-form-link", "turbo:submit-start")
  await nextEventOnTarget(page, "a-form-link", "turbo:before-fetch-response")
  await nextEventOnTarget(page, "a-form-link", "turbo:submit-end")

  assert.notOk(await hasSelector(page, "a-form-link"), "the <form> is removed")
})

test("link method form submission submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#stream-link-method-within-form-outside-frame")
  await nextBeat()

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(await noNextEventNamed(page, "turbo:before-fetch-request"))
  assert.equal(fetchOptions.method, "post", "[data-turbo-method] overrides the GET method")
  assert.equal(requestCounter, 1, "submits a single HTTP request")
})

test("link method form submission inside frame submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#stream-link-method-inside-frame")
  await nextBeat()

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(await noNextEventNamed(page, "turbo:before-fetch-request"))
  assert.equal(fetchOptions.method, "post", "[data-turbo-method] overrides the GET method")
  assert.equal(requestCounter, 1, "submits a single HTTP request")
})

test("link method form submission targeting frame submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#turbo-method-post-to-targeted-frame")
  await nextBeat()

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(await noNextEventNamed(page, "turbo:before-fetch-request"))
  assert.equal(fetchOptions.method, "post", "[data-turbo-method] overrides the GET method")
  assert.equal(requestCounter, 2, "submits a single HTTP request then follows a redirect")
})

test("link method form submission inside frame", async ({ page }) => {
  await page.click("#link-method-inside-frame")
  await nextBeat()

  assert.equal(await page.textContent("#frame h2"), "Frame: Loaded")
  assert.notOk(await hasSelector(page, "#nested-child"))
})

test("link method form submission inside frame with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#link-method-inside-frame-target-top")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Hello")
})

test("link method form submission inside frame with data-turbo-frame target", async ({ page }) => {
  await page.click("#link-method-inside-frame-with-target")
  await nextBeat()

  const title = await page.locator("h1")
  const frameTitle = await page.locator("#hello h2")
  assert.equal(await frameTitle.textContent(), "Hello from a frame")
  assert.equal(await title.textContent(), "Form")
})

test("stream link method form submission inside frame", async ({ page }) => {
  await page.click("#stream-link-method-inside-frame")
  await nextBeat()

  const message = page.locator("#frame div.message")
  assert.equal(await message.textContent(), "Link!")
})

test("stream link GET method form submission inside frame", async ({ page }) => {
  await page.click("#stream-link-get-method-inside-frame")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
})

test("stream link inside frame", async ({ page }) => {
  await page.click("#stream-link-inside-frame")

  const { fetchOptions, url } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
  assert.equal(getSearchParam(url, "content"), "Link!")
})

test("link method form submission within form inside frame", async ({ page }) => {
  await page.click("#stream-link-method-within-form-inside-frame")
  await nextBeat()

  const message = page.locator("#frame div.message")
  assert.equal(await message.textContent(), "Link!")
})

test("link method form submission inside frame with confirmation confirmed", async ({ page }) => {
  page.on("dialog", (dialog) => {
    assert.equal(dialog.message(), "Are you sure?")
    dialog.accept()
  })

  await page.click("#link-method-inside-frame-with-confirmation")
  await nextBeat()

  const message = page.locator("#frame div.message")
  assert.equal(await message.textContent(), "Link!")
})

test("link method form submission inside frame with confirmation cancelled", async ({ page }) => {
  page.on("dialog", (dialog) => {
    assert.equal(dialog.message(), "Are you sure?")
    dialog.dismiss()
  })

  await page.click("#link-method-inside-frame-with-confirmation")
  await nextBeat()

  assert.notOk(await hasSelector(page, "#frame div.message"), "Not confirming form submission does not submit the form")
})

test("link method form submission outside frame", async ({ page }) => {
  await page.click("#link-method-outside-frame")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Hello")
})

test("following a link with [data-turbo-method] set and a target set navigates the target frame", async ({
  page
}) => {
  await page.click("#turbo-method-post-to-targeted-frame")

  assert.equal(await page.textContent("#hello h2"), "Hello from a frame", "drives the turbo-frame")
})

test("following a link with [data-turbo-method] and [data-turbo=true] set when html[data-turbo=false]", async ({
  page
}) => {
  const html = await page.locator("html")
  await html.evaluate((html) => html.setAttribute("data-turbo", "false"))

  const link = await page.locator("#turbo-method-post-to-targeted-frame")
  await link.evaluate((link) => link.setAttribute("data-turbo", "true"))

  await link.click()

  assert.equal(await page.textContent("h1"), "Form", "does not navigate the full page")
  assert.equal(await page.textContent("#hello h2"), "Hello from a frame", "drives the turbo-frame")
})

test("following a link with [data-turbo-method] and [data-turbo=true] set when Turbo.session.drive = false", async ({
  page
}) => {
  await page.evaluate(() => (window.Turbo.session.drive = false))

  const link = await page.locator("#turbo-method-post-to-targeted-frame")
  await link.evaluate((link) => link.setAttribute("data-turbo", "true"))

  await link.click()

  assert.equal(await page.textContent("h1"), "Form", "does not navigate the full page")
  assert.equal(await page.textContent("#hello h2"), "Hello from a frame", "drives the turbo-frame")
})

test("following a link with [data-turbo-method] set when html[data-turbo=false]", async ({ page }) => {
  const html = await page.locator("html")
  await html.evaluate((html) => html.setAttribute("data-turbo", "false"))

  await page.click("#turbo-method-post-to-targeted-frame")

  assert.equal(await page.textContent("h1"), "Hello", "treats link full-page navigation")
})

test("following a link with [data-turbo-method] set when Turbo.session.drive = false", async ({ page }) => {
  await page.evaluate(() => (window.Turbo.session.drive = false))
  await page.click("#turbo-method-post-to-targeted-frame")

  assert.equal(await page.textContent("h1"), "Hello", "treats link full-page navigation")
})

test("stream link method form submission outside frame", async ({ page }) => {
  await page.click("#stream-link-method-outside-frame")
  await nextBeat()

  const message = page.locator("#frame div.message")
  assert.equal(await message.textContent(), "Link!")
})

test("link method form submission within form outside frame", async ({ page }) => {
  await page.click("#link-method-within-form-outside-frame")
  await nextBody(page)

  const title = await page.locator("h1")
  assert.equal(await title.textContent(), "Hello")
})

test("stream link method form submission within form outside frame", async ({ page }) => {
  await page.click("#stream-link-method-within-form-outside-frame")
  await nextBeat()

  assert.equal(await page.textContent("#frame div.message"), "Link!")
})

test("turbo:before-fetch-request fires on the form element", async ({ page }) => {
  await page.click('#targets-frame form.one [type="submit"]')
  assert.ok(await nextEventOnTarget(page, "form_one", "turbo:before-fetch-request"))
})

test("turbo:before-fetch-response fires on the form element", async ({ page }) => {
  await page.click('#targets-frame form.one [type="submit"]')
  assert.ok(await nextEventOnTarget(page, "form_one", "turbo:before-fetch-response"))
})

test("POST to external action ignored", async ({ page }) => {
  await page.click("#submit-external")

  assert.ok(await noNextEventNamed(page, "turbo:before-fetch-request"))

  await nextBody(page)

  assert.equal(page.url(), "https://httpbin.org/post")
})

test("POST to external action within frame ignored", async ({ page }) => {
  await page.click("#submit-external-within-ignored")

  assert.ok(await noNextEventNamed(page, "turbo:before-fetch-request"))

  await nextBody(page)

  assert.equal(page.url(), "https://httpbin.org/post")
})

test("POST to external action targeting frame ignored", async ({ page }) => {
  await page.click("#submit-external-target-ignored")

  assert.ok(await noNextEventNamed(page, "turbo:before-fetch-request"))

  await nextBody(page)

  assert.equal(page.url(), "https://httpbin.org/post")
})

test("form submission skipped with form[target]", async ({ page }) => {
  await page.click("#skipped form[target] button")
  await nextBeat()

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.notOk(await formSubmitEnded(page))
})

test("form submission skipped with submitter button[formtarget]", async ({ page }) => {
  await page.click("#skipped [formtarget]")
  await nextBeat()

  assert.equal(pathname(page.url()), "/src/tests/fixtures/form.html")
  assert.notOk(await formSubmitEnded(page))
})

function formSubmitStarted(page) {
  return getFromLocalStorage(page, "formSubmitStarted")
}

function formSubmitEnded(page) {
  return getFromLocalStorage(page, "formSubmitEnded")
}
