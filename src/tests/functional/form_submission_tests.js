import { expect, test } from "@playwright/test"
import {
  getFromLocalStorage,
  getSearchParam,
  hasSelector,
  isScrolledToTop,
  nextAttributeMutationNamed,
  nextBeat,
  nextEventNamed,
  nextEventOnTarget,
  noNextEventNamed,
  outerHTMLForSelector,
  readEventLogs,
  scrollToSelector,
  setLocalStorageFromEvent,
  visitAction,
  withPathname,
  withSearch,
  withSearchParam
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

  await expect(page.locator(".turbo-progress-bar"), "displays progress bar").toBeAttached()

  await nextEventNamed(page, "turbo:load")
  await expect(page.locator(".turbo-progress-bar"), "hides progress bar").not.toBeAttached()
})

test("form submission with confirmation confirmed", async ({ page }) => {
  page.on("dialog", (alert) => {
    expect(alert.message()).toEqual("Are you sure?")
    alert.accept()
  })

  await page.click("#standard form.confirm input[type=submit]")

  await nextEventNamed(page, "turbo:load")
  expect(await formSubmitStarted(page)).toEqual("true")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
})

test("form submission with confirmation cancelled", async ({ page }) => {
  page.on("dialog", (alert) => {
    expect(alert.message()).toEqual("Are you sure?")
    alert.dismiss()
  })
  await page.click("#standard form.confirm input[type=submit]")

  expect(await formSubmitStarted(page)).toEqual(null)
})

test("form submission with secondary submitter click - confirmation confirmed", async ({ page }) => {
  page.on("dialog", (alert) => {
    expect(alert.message()).toEqual("Are you really sure?")
    alert.accept()
  })

  await page.click("#standard form.confirm #secondary_submitter")

  await nextEventNamed(page, "turbo:load")
  expect(await formSubmitStarted(page)).toEqual("true")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
  expect(await visitAction(page)).toEqual("advance")
  await expect(page).toHaveURL(withSearchParam("greeting", "secondary_submitter"))
})

test("form submission with secondary submitter click - confirmation cancelled", async ({ page }) => {
  page.on("dialog", (alert) => {
    expect(alert.message()).toEqual("Are you really sure?")
    alert.dismiss()
  })

  await page.click("#standard form.confirm #secondary_submitter")

  expect(await formSubmitStarted(page)).toEqual(null)
})

test("from submission with confirmation overridden", async ({ page }) => {
  page.on("dialog", (alert) => {
    expect(alert.message()).toEqual("Overridden message")
    alert.accept()
  })

  await page.evaluate(() => window.Turbo.setConfirmMethod(() => Promise.resolve(confirm("Overridden message"))))
  await page.click("#standard form.confirm input[type=submit]")

  expect(await formSubmitStarted(page)).toEqual("true")
})

test("standard form submission does not render a progress bar before expiring the delay", async ({ page }) => {
  await page.evaluate(() => window.Turbo.setProgressBarDelay(500))
  await page.click("#standard form.redirect input[type=submit]")

  await expect(page.locator(".turbo-progress-bar"), "does not show progress bar before delay").not.toBeAttached()
})

test("standard POST form submission with redirect response", async ({ page }) => {
  await page.click("#standard form.redirect input[type=submit]")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("greeting", "Hello from a redirect"))
  expect(await formSubmitStarted(page)).toEqual("true")
  expect(await visitAction(page)).toEqual("advance")
  expect(
    await nextAttributeMutationNamed(page, "html", "aria-busy"),
    "sets [aria-busy] on the document element"
  ).toEqual("true")
  expect(
    await nextAttributeMutationNamed(page, "html", "aria-busy"),
    "removes [aria-busy] from the document element"
  ).toEqual(null)
})


test("sets aria-busy on the form element during a form submission", async ({ page }) => {
  await page.click("#standard form.redirect input[type=submit]")

  await nextEventNamed(page, "turbo:submit-start")
  expect(
    await nextAttributeMutationNamed(page, "standard-form", "aria-busy"),
    "sets [aria-busy] on the form element"
  ).toEqual("true")

  await nextEventNamed(page, "turbo:submit-end")
  expect(
    await nextAttributeMutationNamed(page, "standard-form", "aria-busy"),
    "removes [aria-busy] from the form element"
  ).toEqual(null)
})

test("standard POST form submission events", async ({ page }) => {
  await page.click("#standard-post-form-submit")

  expect(await formSubmitStarted(page), "fires turbo:submit-start").toEqual("true")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).toContain("text/vnd.turbo-stream.html")

  await nextEventNamed(page, "turbo:before-fetch-response")

  expect(await formSubmitEnded(page), "fires turbo:submit-end").toEqual("true")

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

  await expect(page.locator("h1"), "overrides the method and action").toHaveText("One")
  await expect(page).toHaveURL(withSearchParam("greeting", "Hello, from an event listener"))
})

test("supports transforming a GET submission to a POST in a turbo:submit-start listener", async ({ page }) => {
  await page.evaluate(() =>
    addEventListener("turbo:submit-start", (({ detail }) => {
      detail.formSubmission.method = "POST"
      detail.formSubmission.body.set("path", "/src/tests/fixtures/one.html")
      detail.formSubmission.body.set("greeting", "Hello, from an event listener")
    }))
  )
  await page.click("#standard form[method=get] [type=submit]")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1"), "overrides the method and action").toHaveText("One")
  await expect(page).toHaveURL(withSearchParam("greeting", "Hello, from an event listener"))
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

  await expect(page.locator("h1"), "overrides the method and action").toHaveText("One")
  await expect(page).toHaveURL(withSearchParam("greeting", "Hello from a redirect"))
})

test("standard POST form submission merges values from both searchParams and body", async ({ page }) => {
  await page.click("#form-action-post-redirect-self-q-b")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("q", "b"))
  await expect(page).toHaveURL(withSearchParam("sort", "asc"))
})

test("standard POST form submission toggles submitter [disabled] attribute", async ({ page }) => {
  await page.click("#standard-post-form-submit")

  expect(
    await nextAttributeMutationNamed(page, "standard-post-form-submit", "disabled"),
    "sets [disabled] on the submitter"
  ).toEqual("")
  expect(
    await nextAttributeMutationNamed(page, "standard-post-form-submit", "disabled"),
    "removes [disabled] from the submitter"
  ).toEqual(null)
})

test("standard POST form submission toggles submitter [aria-disabled=true] attribute", async ({ page }) => {
  await page.evaluate(() => window.Turbo.config.forms.submitter = "aria-disabled")
  await page.click("#standard-post-form-submit")

  expect(
    await nextAttributeMutationNamed(page, "standard-post-form-submit", "aria-disabled"),
    "sets [aria-disabled=true] on the submitter"
  ).toEqual("true")
  expect(
    await nextAttributeMutationNamed(page, "standard-post-form-submit", "aria-disabled"),
    "removes [aria-disabled] from the submitter"
  ).toEqual(null)
})

test("replaces input value with data-turbo-submits-with on form submission", async ({ page }) => {
  page.click("#submits-with-form-input")

  expect(
    await nextAttributeMutationNamed(page, "submits-with-form-input", "value"),
    "sets data-turbo-submits-with on the submitter"
  ).toEqual("Saving...")

  expect(
    await nextAttributeMutationNamed(page, "submits-with-form-input", "value"),
    "restores the original submitter text value"
  ).toEqual("Save")
})

test("replaces button innerHTML with data-turbo-submits-with on form submission", async ({ page }) => {
  await page.click("#submits-with-form-button")

  await nextEventNamed(page, "turbo:submit-start")
  await expect(
    page.locator("#submits-with-form-button"),
    "sets data-turbo-submits-with on the submitter"
  ).toHaveText("Saving...")

  await nextEventNamed(page, "turbo:submit-end")
  await expect(
    page.locator("#submits-with-form-button"),
    "sets data-turbo-submits-with on the submitter"
  ).toHaveText("Save")
})

test("standard GET form submission", async ({ page }) => {
  await page.click("#standard form.greeting input[type=submit]")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
  await expect(page).toHaveURL(withSearchParam("greeting", "Hello from a form"))
  expect(await formSubmitStarted(page)).toEqual("true")
  expect(await visitAction(page)).toEqual("advance")
  expect(
    await nextAttributeMutationNamed(page, "html", "aria-busy"),
    "sets [aria-busy] on the document element"
  ).toEqual("true")
  expect(
    await nextAttributeMutationNamed(page, "html", "aria-busy"),
    "removes [aria-busy] from the document element"
  ).toEqual(null)
})

test("standard GET HTMLFormElement.requestSubmit() with Turbo Action", async ({ page }) => {
  await page.evaluate(() => {
    const formControl = document.querySelector("#external-select")

    if (formControl && formControl.form) formControl.form.requestSubmit()
  })
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1"), "Retains original page state").toHaveText("Form")
  await expect(page.locator("#hello h2"), "navigates #hello turbo frame").toHaveText("Hello from a frame")
  expect(await visitAction(page), "reads Turbo Action from <form>").toEqual("replace")
  await expect(page, "promotes frame navigation to page Visit").toHaveURL(withPathname("/src/tests/fixtures/frames/hello.html"))
  await expect(page, "encodes <form> into request").toHaveURL(withSearchParam("greeting", "Hello from a replace Visit"))
})

test("GET HTMLFormElement.requestSubmit() triggered by javascript", async ({ page }) => {
  await page.click("#request-submit-trigger")

  await expect(page.locator("#hello h2"), "navigates #hello turbo frame").toHaveText("Hello from a frame")
  await expect(page, "SubmitEvent was triggered without a submitter").not.toHaveURL(withPathname("/src/tests/fixtures/one.html"))
})

test("standard GET form submission with [data-turbo-stream] declared on the form", async ({ page }) => {
  await page.click("#standard-get-form-with-stream-opt-in-submit")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).toContain("text/vnd.turbo-stream.html")
})

test("standard GET form submission with [data-turbo-stream] declared on submitter", async ({ page }) => {
  await page.click("#standard-get-form-with-stream-opt-in-submitter")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).toContain("text/vnd.turbo-stream.html")
})

test("standard GET form submission events", async ({ page }) => {
  await page.click("#standard-get-form-submit")

  expect(await formSubmitStarted(page), "fires turbo:submit-start").toEqual("true")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).not.toContain("text/vnd.turbo-stream.html")

  await nextEventNamed(page, "turbo:before-fetch-response")

  expect(await formSubmitEnded(page), "fires turbo:submit-end").toEqual("true")

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

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("sort", "asc"))

  await page.click("#form-action-none-q-a")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page, "navigates without omitted keys").toHaveURL(withSearchParam("q", "a"))
})

test("standard GET form submission does not merge values into the [action] attribute", async ({ page }) => {
  await page.click("#form-action-self-sort")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("sort", "asc"))

  await page.click("#form-action-self-q-b")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page, "navigates without omitted keys").toHaveURL(withSearchParam("q", "b"))
})

test("standard GET form submission omits the [action] value's URLSearchParams from the submission", async ({
  page
}) => {
  await page.click("#form-action-self-submit")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page, "navigates without omitted keys").toHaveURL(withSearch(""))
})

test("standard GET form submission toggles submitter [disabled] attribute", async ({ page }) => {
  await page.click("#standard-get-form-submit")

  expect(
    await nextAttributeMutationNamed(page, "standard-get-form-submit", "disabled"),
    "sets [disabled] on the submitter"
  ).toEqual("")
  expect(
    await nextAttributeMutationNamed(page, "standard-get-form-submit", "disabled"),
    "removes [disabled] from the submitter"
  ).toEqual(null)
})

test("standard GET form submission toggles submitter [aria-disabled] attribute", async ({ page }) => {
  await page.evaluate(() => window.Turbo.config.forms.submitter = "aria-disabled")
  await page.click("#standard-get-form-submit")

  expect(
    await nextAttributeMutationNamed(page, "standard-get-form-submit", "aria-disabled"),
    "sets [aria-disabled] on the submitter"
  ).toEqual("true")
  expect(
    await nextAttributeMutationNamed(page, "standard-get-form-submit", "aria-disabled"),
    "removes [aria-disabled] from the submitter"
  ).toEqual(null)
})

test("standard GET form submission appending keys", async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html?query=1")
  await page.click("#standard form.conflicting-values input[type=submit]")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("query", "2"))
})

test("standard form submission with empty created response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "body")
  const button = await page.locator("#standard form.created input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "body")
  expect(htmlAfter).toEqual(htmlBefore)
})

test("standard form submission with empty no-content response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "body")
  const button = await page.locator("#standard form.no-content input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "body")
  expect(htmlAfter).toEqual(htmlBefore)
})

test("standard POST form submission with multipart/form-data enctype", async ({ page }) => {
  await page.click("#standard form[method=post][enctype] input[type=submit]")

  await expect(
    page,
    "submits a multipart/form-data request"
  ).toHaveURL((url) => {
    const enctype = url.searchParams.get("enctype")
    return enctype?.startsWith("multipart/form-data")
  })
})

test("standard GET form submission ignores enctype", async ({ page }) => {
  await page.click("#standard form[method=get][enctype] input[type=submit]")

  await expect(page, "GET form submissions ignore enctype").not.toHaveURL(url => url.searchParams.has("enctype"))
})

test("standard POST form submission without an enctype", async ({ page }) => {
  await page.click("#standard form[method=post].no-enctype input[type=submit]")

  await expect(
    page,
    "submits a application/x-www-form-urlencoded request"
  ).toHaveURL((url) => {
    const enctype = url.searchParams.get("enctype")
    return enctype?.startsWith("application/x-www-form-urlencoded")
  })
})

test("no-action form submission with single parameter", async ({ page }) => {
  await page.click("#no-action form.single input[type=submit]")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("query", "1"))

  await page.click("#no-action form.single input[type=submit]")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("query", "1"))

  await page.goto("/src/tests/fixtures/form.html?query=2")
  await page.click("#no-action form.single input[type=submit]")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("query", "1"))
})

test("no-action form submission with multiple parameters", async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html?query=2")
  await page.click("#no-action form.multiple input[type=submit]")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("query", ["1", "2"]))
  await nextEventNamed(page, "turbo:load")

  await page.click("#no-action form.multiple input[type=submit]")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("query", ["1", "2"]))
})

test("no-action form submission submitter parameters", async ({ page }) => {
  await page.click("#no-action form.button-param [type=submit]")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("query", "1"))
  await expect(page).toHaveURL(withSearchParam("button", [""]))

  await page.click("#no-action form.button-param [type=submit]")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("query", "1"))
  await expect(page).toHaveURL(withSearchParam("button", [""]))
})

test("submitter with blank formaction submits to the current page", async ({ page }) => {
  await page.click("#blank-formaction button")
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page.locator("#blank-formaction"), "overrides form[action] navigation").toBeAttached()
})

test("input named action with no action attribute", async ({ page }) => {
  await page.click("#action-input form.no-action [type=submit]")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("action", "1"))
  await expect(page).toHaveURL(withSearchParam("query", "1"))
})

test("input named action with action attribute", async ({ page }) => {
  await page.click("#action-input form.action [type=submit]")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
  await expect(page).toHaveURL(withSearchParam("action", "1"))
  await expect(page).toHaveURL(withSearchParam("query", "1"))
})

test("invalid form submission with unprocessable content status", async ({ page }) => {
  await page.click("#reject form.unprocessable_content input[type=submit]")

  await expect(page.locator("h1"), "renders the response HTML").toHaveText("Unprocessable Content")
  await expect(page.locator("#frame form.reject"), "replaces entire page").not.toBeAttached()
})

test("invalid form submission with long form", async ({ page }) => {
  await scrollToSelector(page, "#reject form.unprocessable_content_with_tall_form input[type=submit]")
  await page.click("#reject form.unprocessable_content_with_tall_form input[type=submit]")

  await expect(page.locator("h1"), "renders the response HTML").toHaveText("Unprocessable Content")
  expect(await isScrolledToTop(page), "page is scrolled to the top").toBeTruthy()
  await expect(page.locator("#frame form.reject"), "replaces entire page").not.toBeAttached()
})

test("invalid form submission with server error status", async ({ page }) => {
  await expect(page.locator("head > #form-fixture-styles")).toBeAttached()
  await page.click("#reject form.internal_server_error input[type=submit]")

  await expect(page.locator("h1"), "renders the response HTML").toHaveText("Internal Server Error")
  await expect(page.locator("head > #form-fixture-styles"), "replaces head").not.toBeAttached()
  await expect(page.locator("#frame form.reject"), "replaces entire page").not.toBeAttached()
})

test("form submission with network error", async ({ page }) => {
  await page.context().setOffline(true)
  await page.click("#reject-form [type=submit]")
  await nextEventOnTarget(page, "reject-form", "turbo:fetch-request-error")
})

test("submitter form submission reads button attributes", async ({ page }) => {
  const button = await page.locator("#submitter form button[type=submit][formmethod=post]")
  await button.click()

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/two.html"))
  expect(await visitAction(page)).toEqual("advance")
})

test("submitter POST form submission with multipart/form-data formenctype", async ({ page }) => {
  await page.click("#submitter form[method=post]:not([enctype]) input[formenctype]")

  await expect(
    page,
    "submits a multipart/form-data request"
  ).toHaveURL((url) => {
    const enctype = url.searchParams.get("enctype")
    return enctype?.startsWith("multipart/form-data")
  })
})

test("submitter GET submission from submitter with data-turbo-frame", async ({ page }) => {
  await page.click("#submitter form[method=get] [type=submit][data-turbo-frame]")

  await expect(page.locator("#frame div.message")).toHaveText("Frame redirected")
  await expect(page.locator("h1")).toHaveText("Form")
})

test("submitter POST submission from submitter with data-turbo-frame", async ({ page }) => {
  await page.click("#submitter form[method=post] [type=submit][data-turbo-frame]")

  await expect(page.locator("#frame div.message")).toHaveText("Frame redirected")
  await expect(page.locator("h1")).toHaveText("Form")
})

test("form[data-turbo-frame=_top] submission", async ({ page }) => {
  const form = await page.locator("#standard form.redirect[data-turbo-frame=_top]")

  await form.locator("button").click()
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("One")
})

test("form[data-turbo-frame=_top] submission within frame", async ({ page }) => {
  const frame = await page.locator("turbo-frame#frame")
  const form = await frame.locator("form.redirect[data-turbo-frame=_top]")

  await form.locator("button").click()
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Frames: Form")
})

test("frame form GET submission from submitter with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#frame form[method=get] [type=submit][data-turbo-frame=_top]")

  await expect(page.locator("h1")).toHaveText("One")
})

test("frame form POST submission from submitter with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#frame form[method=post] [type=submit][data-turbo-frame=_top]")

  await expect(page.locator("h1")).toHaveText("One")
})

test("frame POST form targeting frame submission", async ({ page }) => {
  await page.click("#targets-frame-post-form-submit")

  expect(await formSubmitStarted(page), "fires turbo:submit-start").toEqual("true")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).toContain("text/vnd.turbo-stream.html")
  expect("frame").toEqual(fetchOptions.headers["Turbo-Frame"])

  await nextEventNamed(page, "turbo:before-fetch-response")

  await nextEventNamed(page, "turbo:frame-render")
  await nextEventNamed(page, "turbo:frame-load")
  await nextEventNamed(page, "turbo:submit-end")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)

  const src = (await page.getAttribute("#frame", "src")) || ""
  expect(new URL(src).pathname).toEqual("/src/tests/fixtures/frames/frame.html")
})

test("frame POST form targeting frame toggles submitter's [disabled] attribute", async ({ page }) => {
  await page.click("#targets-frame-post-form-submit")

  expect(
    await nextAttributeMutationNamed(page, "targets-frame-post-form-submit", "disabled"),
    "sets [disabled] on the submitter"
  ).toEqual("")
  expect(
    await nextAttributeMutationNamed(page, "targets-frame-post-form-submit", "disabled"),
    "removes [disabled] from the submitter"
  ).toEqual(null)
})

test("frame POST form targeting frame toggles submitter's [aria-disabled] attribute", async ({ page }) => {
  await page.evaluate(() => window.Turbo.config.forms.submitter = "aria-disabled")
  await page.click("#targets-frame-post-form-submit")

  expect(
    await nextAttributeMutationNamed(page, "targets-frame-post-form-submit", "aria-disabled"),
    "sets [aria-disabled] on the submitter"
  ).toEqual("true")
  expect(
    await nextAttributeMutationNamed(page, "targets-frame-post-form-submit", "aria-disabled"),
    "removes [aria-disabled] from the submitter"
  ).toEqual(null)
})

test("frame GET form targeting frame submission", async ({ page }) => {
  await page.click("#targets-frame-get-form-submit")

  expect(await formSubmitStarted(page), "fires turbo:submit-start").toEqual("true")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).not.toContain("text/vnd.turbo-stream.html")
  expect(fetchOptions.headers["Turbo-Frame"]).toEqual("frame")

  await nextEventNamed(page, "turbo:before-fetch-response")

  await nextEventNamed(page, "turbo:frame-render")
  await nextEventNamed(page, "turbo:frame-load")
  await nextEventNamed(page, "turbo:submit-end")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)

  const src = (await page.getAttribute("#frame", "src")) || ""
  expect(new URL(src).pathname).toEqual("/src/tests/fixtures/frames/frame.html")
})

test("frame GET form targeting frame toggles submitter's [disabled] attribute", async ({ page }) => {
  await page.click("#targets-frame-get-form-submit")

  expect(
    await nextAttributeMutationNamed(page, "targets-frame-get-form-submit", "disabled"),
    "sets [disabled] on the submitter"
  ).toEqual("")
  expect(
    await nextAttributeMutationNamed(page, "targets-frame-get-form-submit", "disabled"),
    "removes [disabled] from the submitter"
  ).toEqual(null)
})

test("frame GET form targeting frame toggles submitter's [aria-disabled] attribute", async ({ page }) => {
  await page.evaluate(() => window.Turbo.config.forms.submitter = "aria-disabled")
  await page.click("#targets-frame-get-form-submit")

  expect(
    await nextAttributeMutationNamed(page, "targets-frame-get-form-submit", "aria-disabled"),
    "sets [aria-disabled] on the submitter"
  ).toEqual("true")
  expect(
    await nextAttributeMutationNamed(page, "targets-frame-get-form-submit", "aria-disabled"),
    "removes [aria-disabled] from the submitter"
  ).toEqual(null)
})

test("frame form GET submission from submitter referencing another frame", async ({ page }) => {
  await page.click("#frame form[method=get] [type=submit][data-turbo-frame=hello]")

  await expect(page.locator("h1")).toHaveText("Form")
  await expect(page.locator("#hello h2")).toHaveText("Hello from a frame")
})

test("frame form POST submission from submitter referencing another frame", async ({ page }) => {
  await page.click("#frame form[method=post] [type=submit][data-turbo-frame=hello]")

  await expect(page.locator("h1")).toHaveText("Form")
  await expect(page.locator("#hello h2")).toHaveText("Hello from a frame")
})

test("frame form submission with redirect response", async ({ page }) => {
  const path = (await page.getAttribute("#frame form.redirect input[name=path]", "value")) || ""
  const url = new URL(path, "http://localhost:9000")
  url.searchParams.set("enctype", "application/x-www-form-urlencoded;charset=UTF-8")

  const button = await page.locator("#frame form.redirect input[type=submit]")
  await button.click()
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  await expect(page.locator("#frame form.redirect")).not.toBeAttached()
  await expect(page.locator("#frame div.message")).toHaveText("Frame redirected")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page, "does not redirect _top").toHaveURL(withSearch(""))
  await expect(page.locator("#frame"), "redirects the target frame").toHaveAttribute("src", url.href)
})

test("frame POST form submission toggles the ancestor frame's [aria-busy] attribute", async ({ page }) => {
  await page.click("#frame form.redirect input[type=submit]")

  expect(await nextAttributeMutationNamed(page, "frame", "busy"), "sets [busy] on the #frame").toEqual("")
  expect(await nextAttributeMutationNamed(page, "frame", "aria-busy"), "sets [aria-busy] on the #frame").toEqual("true")
  expect(await nextAttributeMutationNamed(page, "frame", "busy"), "removes [busy] from the #frame").toEqual(null)
  expect(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    "removes [aria-busy] from the #frame"
  ).toEqual(null)
})

test("frame POST form submission toggles the target frame's [aria-busy] attribute", async ({ page }) => {
  await page.click('#targets-frame form.frame [type="submit"]')

  expect(await nextAttributeMutationNamed(page, "frame", "busy"), "sets [busy] on the #frame").toEqual("")
  expect(await nextAttributeMutationNamed(page, "frame", "aria-busy"), "sets [aria-busy] on the #frame").toEqual("true")

  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  expect(await nextAttributeMutationNamed(page, "frame", "busy"), "removes [busy] from the #frame").toEqual(null)
  expect(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    "removes [aria-busy] from the #frame"
  ).toEqual(null)
})

test("frame form submission with empty created response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "#frame")
  const button = await page.locator("#frame form.created input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "#frame")
  expect(htmlAfter).toEqual(htmlBefore)
})

test("frame form submission with empty no-content response", async ({ page }) => {
  const htmlBefore = await outerHTMLForSelector(page, "#frame")
  const button = await page.locator("#frame form.no-content input[type=submit]")
  await button.click()
  await nextBeat()

  const htmlAfter = await outerHTMLForSelector(page, "#frame")
  expect(htmlAfter).toEqual(htmlBefore)
})

test("frame form submission within a frame submits the Turbo-Frame header", async ({ page }) => {
  await page.click("#frame form.redirect input[type=submit]")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header").toBeTruthy()
})

test("invalid frame form submission with unprocessable content status", async ({ page }) => {
  await page.click("#frame form.unprocessable_content input[type=submit]")

  expect(await formSubmitStarted(page), "fires turbo:submit-start").toEqual("true")
  await nextEventNamed(page, "turbo:before-fetch-request")
  await nextEventNamed(page, "turbo:before-fetch-response")
  expect(await formSubmitEnded(page), "fires turbo:submit-end").toEqual("true")
  await nextEventNamed(page, "turbo:frame-render")
  await nextEventNamed(page, "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)

  expect(await hasSelector(page, "#reject form"), "only replaces frame").toBeTruthy()
  await expect(page.locator("#frame h2")).toHaveText("Frame: Unprocessable Content")
})

test("invalid frame form submission with internal server error status", async ({ page }) => {
  await page.click("#frame form.internal_server_error input[type=submit]")

  expect(await formSubmitStarted(page), "fires turbo:submit-start").toEqual("true")
  await nextEventNamed(page, "turbo:before-fetch-request")
  await nextEventNamed(page, "turbo:before-fetch-response")
  expect(await formSubmitEnded(page), "fires turbo:submit-end").toEqual("true")
  await nextEventNamed(page, "turbo:frame-render")
  await nextEventNamed(page, "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)

  expect(await hasSelector(page, "#reject form"), "only replaces frame").toBeTruthy()
  await expect(page.locator("#frame h2")).toHaveText("Frame: Internal Server Error")
})

test("frame form submission with stream response", async ({ page }) => {
  const button = await page.locator("#frame form.stream[method=post] input[type=submit]")
  await button.click()

  await expect(page.locator("#frame div.message")).toHaveText("Hello!")
  await expect(page.locator("#frame form.redirect").first()).toBeAttached()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page.locator("#frame"), "does not change frame's src").not.toHaveAttribute("src")
})

test("frame form submission with HTTP verb other than GET or POST", async ({ page }) => {
  await page.click("#frame form.put.stream input[type=submit]")

  await expect(page.locator("#frame div.message")).toHaveText("1: Hello!")
  await expect(page.locator("#frame form.redirect").first()).toBeAttached()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
})

test("frame form submission with [data-turbo=false] on the form", async ({ page }) => {
  await page.click('#frame form[data-turbo="false"] input[type=submit]')

  await expect(page.locator("#element-id")).toBeAttached()
  expect(await formSubmitStarted(page)).toEqual(null)
})

test("frame form submission with [data-turbo=false] on the submitter", async ({ page }) => {
  await page.click('#frame form:not([data-turbo]) input[data-turbo="false"]')

  await expect(page.locator("#element-id")).toBeAttached()
  expect(await formSubmitStarted(page)).toEqual(null)
})

test("frame form submission ignores submissions with their defaultPrevented", async ({ page }) => {
  await page.evaluate(() => document.addEventListener("submit", (event) => event.preventDefault(), true))
  await page.click("#frame .redirect [type=submit]")

  await expect(page.locator("#frame h2")).toHaveText("Frame: Form")
  await expect(page.locator("#frame"), "does not navigate frame").not.toHaveAttribute("src")
})

test("form submission with [data-turbo=false] on the form", async ({ page }) => {
  await page.click('#turbo-false form[data-turbo="false"] input[type=submit]')

  await expect(page.locator("#element-id")).toBeAttached()
  expect(await formSubmitStarted(page)).toEqual(null)
})

test("form submission with [data-turbo=false] on the submitter", async ({ page }) => {
  await page.click('#turbo-false form:not([data-turbo]) input[data-turbo="false"]')

  await expect(page.locator("#element-id")).toBeAttached()
  expect(await formSubmitStarted(page)).toEqual(null)
})

test("form submission skipped within method=dialog", async ({ page }) => {
  const dialog = page.locator("#dialog-method")
  await dialog.click('[type="submit"]')

  await expect(dialog).not.toHaveAttribute("open")
  expect(await formSubmitStarted(page)).toEqual(null)
})

test("form submission skipped with submitter formmethod=dialog", async ({ page }) => {
  const dialog = page.locator("#dialog-formmethod-turbo-frame")
  await dialog.click('[formmethod="dialog"]')

  await expect(dialog).not.toHaveAttribute("open")
  expect(await formSubmitStarted(page)).toEqual(null)
})

test("form submission targeting frame skipped within method=dialog", async ({ page }) => {
  const dialog = page.locator("#dialog-formmethod-turbo-frame")
  await dialog.click("button")

  await expect(dialog).not.toHaveAttribute("open")
  expect(await formSubmitStarted(page)).toEqual(null)
})

test("form submission targeting frame skipped with submitter formmethod=dialog", async ({ page }) => {
  const dialog = page.locator("#dialog-formmethod")
  await dialog.click('[formmethod="dialog"]')

  await expect(dialog).not.toHaveAttribute("open")
  expect(await formSubmitStarted(page)).toEqual(null)
})

test("form submission targets disabled frame", async ({ page }) => {
  await page.evaluate(() => document.getElementById("frame")?.setAttribute("disabled", ""))
  await page.click('#targets-frame form.one [type="submit"]')

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
})

test("form submission targeting a frame submits the Turbo-Frame header", async ({ page }) => {
  await page.click("#targets-frame [type=submit]")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header").toBeTruthy()
})

test("form submission targeting another frame submits the Turbo-Frame header", async ({ page }) => {
  await page.click("#frame form[method=get][data-turbo-frame=hello] [type=submit]")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header").toEqual("hello")
})

test("form submission with submitter referencing another frame submits the Turbo-Frame header", async ({ page }) => {
  await page.click("#frame form[method=get] [type=submit][data-turbo-frame=hello]")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header").toEqual("hello")
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

  await expect(page.locator("a-form-link"), "the <form> is removed").not.toBeAttached()
})

test("link method form submission submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#stream-link-method-within-form-outside-frame")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  await noNextEventNamed(page, "turbo:before-fetch-request")
  expect(fetchOptions.method, "[data-turbo-method] overrides the GET method").toEqual("POST")
  expect(requestCounter, "submits a single HTTP request").toEqual(1)
})

test("link method form submission inside frame submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#stream-link-method-inside-frame")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  await noNextEventNamed(page, "turbo:before-fetch-request")
  expect(fetchOptions.method, "[data-turbo-method] overrides the GET method").toEqual("POST")
  expect(requestCounter, "submits a single HTTP request").toEqual(1)
})

test("link method form submission targeting frame submits a single request", async ({ page }) => {
  let requestCounter = 0
  page.on("request", () => requestCounter++)

  await page.click("#turbo-method-post-to-targeted-frame")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  await noNextEventNamed(page, "turbo:before-fetch-request")
  expect(fetchOptions.method, "[data-turbo-method] overrides the GET method").toEqual("POST")
  expect.poll(() => requestCounter, "submits a single HTTP request then follows a redirect").toEqual(2)
})

test("link method form submission inside frame", async ({ page }) => {
  await page.click("#link-method-inside-frame")

  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  await expect(page.locator("#nested-child")).not.toBeAttached()
})

test("link method form submission inside frame with data-turbo-frame=_top", async ({ page }) => {
  await page.click("#link-method-inside-frame-target-top")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Hello")
})

test("link method form submission inside frame with data-turbo-frame target", async ({ page }) => {
  await page.click("#link-method-inside-frame-with-target")

  await expect(page.locator("#hello h2")).toHaveText("Hello from a frame")
  await expect(page.locator("h1")).toHaveText("Form")
})

test("stream link method form submission inside frame", async ({ page }) => {
  await page.click("#stream-link-method-inside-frame")

  await expect(page.locator("#frame div.message")).toHaveText("Link!")
})

test("stream link GET method form submission inside frame", async ({ page }) => {
  await page.click("#stream-link-get-method-inside-frame")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).toContain("text/vnd.turbo-stream.html")
})

test("stream link inside frame", async ({ page }) => {
  await page.click("#stream-link-inside-frame")

  const { fetchOptions, url } = await nextEventNamed(page, "turbo:before-fetch-request")

  expect(fetchOptions.headers["Accept"]).toContain("text/vnd.turbo-stream.html")
  expect(getSearchParam(url, "content")).toEqual("Link!")
})

test("link method form submission within form inside frame", async ({ page }) => {
  await page.click("#stream-link-method-within-form-inside-frame")

  await expect(page.locator("#frame div.message")).toHaveText("Link!")
})

test("link method form submission inside frame with confirmation confirmed", async ({ page }) => {
  page.on("dialog", (dialog) => {
    expect(dialog.message()).toEqual("Are you sure?")
    dialog.accept()
  })

  await page.click("#link-method-inside-frame-with-confirmation")

  await expect(page.locator("#frame div.message")).toHaveText("Link!")
})

test("link method form submission inside frame with confirmation cancelled", async ({ page }) => {
  page.on("dialog", (dialog) => {
    expect(dialog.message()).toEqual("Are you sure?")
    dialog.dismiss()
  })

  await page.click("#link-method-inside-frame-with-confirmation")

  await expect(page.locator("#frame div.message"), "Not confirming form submission does not submit the form").not.toBeAttached()
})

test("link method form submission outside frame", async ({ page }) => {
  await page.click("#link-method-outside-frame")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Hello")
})

test("following a link with [data-turbo-method] set and a target set navigates the target frame", async ({
  page
}) => {
  await page.click("#turbo-method-post-to-targeted-frame")

  await expect(page.locator("#hello h2"), "drives the turbo-frame").toHaveText("Hello from a frame")
})

test("following a link with [data-turbo-method] and empty [target]", async ({ page }) => {
  await page.click("#turbo-method-post-empty-target")

  await expect(page.locator("#hello h2"), "drives the turbo-frame").toHaveText("Hello from a frame")
})

test("following a link with [data-turbo-method] and bare [target]", async ({ page }) => {
  await page.click("#turbo-method-post-bare-target")

  await expect(page.locator("#hello h2"), "drives the turbo-frame").toHaveText("Hello from a frame")
})

test("following a link with [data-turbo-method] and [data-turbo=true] set when html[data-turbo=false]", async ({
  page
}) => {
  const html = await page.locator("html")
  await html.evaluate((html) => html.setAttribute("data-turbo", "false"))

  const link = await page.locator("#turbo-method-post-to-targeted-frame")
  await link.evaluate((link) => link.setAttribute("data-turbo", "true"))

  await link.click()

  await expect(page.locator("h1"), "does not navigate the full page").toHaveText("Form")
  await expect(page.locator("#hello h2"), "drives the turbo-frame").toHaveText("Hello from a frame")
})

test("following a link with [data-turbo-method] and [data-turbo=true] set when Turbo.session.drive = false", async ({
  page
}) => {
  await page.evaluate(() => (window.Turbo.config.drive.enabled = false))

  const link = await page.locator("#turbo-method-post-to-targeted-frame")
  await link.evaluate((link) => link.setAttribute("data-turbo", "true"))

  await link.click()

  await expect(page.locator("h1"), "does not navigate the full page").toHaveText("Form")
  await expect(page.locator("#hello h2"), "drives the turbo-frame").toHaveText("Hello from a frame")
})

test("following a link with [data-turbo-method] set when html[data-turbo=false]", async ({ page }) => {
  const html = await page.locator("html")
  await html.evaluate((html) => html.setAttribute("data-turbo", "false"))

  await page.click("#turbo-method-post-to-targeted-frame")

  await expect(page.locator("h1"), "treats link full-page navigation").toHaveText("Hello")
})

test("following a link with [data-turbo-method] set when Turbo.session.drive = false", async ({ page }) => {
  await page.evaluate(() => (window.Turbo.config.drive = false))
  await page.click("#turbo-method-post-to-targeted-frame")

  await expect(page.locator("h1"), "treats link full-page navigation").toHaveText("Hello")
})

test("stream link method form submission outside frame", async ({ page }) => {
  await page.click("#stream-link-method-outside-frame")

  await expect(page.locator("#frame div.message")).toHaveText("Link!")
})

test("link method form submission within form outside frame", async ({ page }) => {
  await page.click("#link-method-within-form-outside-frame")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Hello")
})

test("stream link method form submission within form outside frame", async ({ page }) => {
  await page.click("#stream-link-method-within-form-outside-frame")

  await expect(page.locator("#frame div.message")).toHaveText("Link!")
})

test("turbo:before-fetch-request fires on the form element", async ({ page }) => {
  await page.click('#targets-frame form.one [type="submit"]')
  expect(await nextEventOnTarget(page, "form_one", "turbo:before-fetch-request")).toBeTruthy()
})

test("turbo:before-fetch-response fires on the form element", async ({ page }) => {
  await page.click('#targets-frame form.one [type="submit"]')
  expect(await nextEventOnTarget(page, "form_one", "turbo:before-fetch-response")).toBeTruthy()
})

test("POST to external action ignored", async ({ page }) => {
  await page.click("#submit-external")

  await noNextEventNamed(page, "turbo:before-fetch-request")

  await expect(page).toHaveURL("https://httpbin.org/post")
})

test("POST to external action within frame ignored", async ({ page }) => {
  await page.click("#submit-external-within-ignored")

  await noNextEventNamed(page, "turbo:before-fetch-request")

  await expect(page).toHaveURL("https://httpbin.org/post")
})

test("POST to external action targeting frame ignored", async ({ page }) => {
  await page.click("#submit-external-target-ignored")

  await noNextEventNamed(page, "turbo:before-fetch-request")

  await expect(page).toHaveURL("https://httpbin.org/post")
})

test("form submission skipped with form[target]", async ({ page }) => {
  await page.click("#skipped form[target] button")
  await nextBeat()

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  expect(await formSubmitEnded(page)).toEqual(null)
})

test("form submission skipped with submitter button[formtarget]", async ({ page }) => {
  await page.click("#skipped [formtarget]")
  await nextBeat()

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  expect(await formSubmitEnded(page)).toEqual(null)
})

function formSubmitStarted(page) {
  return getFromLocalStorage(page, "formSubmitStarted")
}

function formSubmitEnded(page) {
  return getFromLocalStorage(page, "formSubmitEnded")
}
