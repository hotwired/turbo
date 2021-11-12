import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FormSubmissionTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/form.html")
    await this.remote.execute(() => {
      addEventListener("turbo:submit-start", () => document.documentElement.setAttribute("data-form-submit-start", ""), { once: true })
      addEventListener("turbo:submit-end", () => document.documentElement.setAttribute("data-form-submit-end", ""), { once: true })
    })
  }

  async "test standard form submission renders a progress bar"() {
    await this.remote.execute(() => window.Turbo.setProgressBarDelay(0))
    await this.clickSelector("#standard form.sleep input[type=submit]")

    await this.waitUntilSelector(".turbo-progress-bar")
    this.assert.ok(await this.hasSelector(".turbo-progress-bar"), "displays progress bar")

    await this.nextBody
    await this.waitUntilNoSelector(".turbo-progress-bar")

    this.assert.notOk(await this.hasSelector(".turbo-progress-bar"), "hides progress bar")
  }

  async "test form submission with confirmation confirmed"() {
    await this.clickSelector("#standard form.confirm input[type=submit]")

    this.assert.equal(await this.getAlertText(), "Are you sure?")
    await this.acceptAlert()
    this.assert.ok(await this.formSubmitStarted)
  }

  async "test form submission with confirmation cancelled"() {
    await this.clickSelector("#standard form.confirm input[type=submit]")

    this.assert.equal(await this.getAlertText(), "Are you sure?")
    await this.dismissAlert()
    this.assert.notOk(await this.formSubmitStarted)
  }

  async "test from submission with confirmation overriden"() {
    await this.remote.execute(() => window.Turbo.setConfirmMethod((message, element) => confirm("Overriden message")))

    await this.clickSelector("#standard form.confirm input[type=submit]")

    this.assert.equal(await this.getAlertText(), "Overriden message")
    await this.acceptAlert()
    this.assert.ok(await this.formSubmitStarted)
  }

  async "test standard form submission does not render a progress bar before expiring the delay"() {
    await this.remote.execute(() => window.Turbo.setProgressBarDelay(500))
    await this.clickSelector("#standard form.redirect input[type=submit]")

    this.assert.notOk(await this.hasSelector(".turbo-progress-bar"), "does not show progress bar before delay")
  }

  async "test standard form submission with redirect response"() {
    await this.clickSelector("#standard form.redirect input[type=submit]")
    await this.nextBody

    this.assert.ok(await this.formSubmitStarted)
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.visitAction, "advance")
    this.assert.equal(await this.getSearchParam("greeting"), "Hello from a redirect")
    this.assert.equal(await this.nextAttributeMutationNamed("html", "aria-busy"), "true", "sets [aria-busy] on the document element")
    this.assert.equal(await this.nextAttributeMutationNamed("html", "aria-busy"), null, "removes [aria-busy] from the document element")
  }

  async "test standard POST form submission events"() {
    await this.clickSelector("#standard-post-form-submit")

    this.assert.ok(await this.formSubmitStarted, "fires turbo:submit-start")

    const { fetchOptions } = await this.nextEventNamed("turbo:before-fetch-request")

    this.assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))

    await this.nextEventNamed("turbo:before-fetch-response")

    this.assert.ok(await this.formSubmitEnded, "fires turbo:submit-end")

    await this.nextEventNamed("turbo:before-visit")
    await this.nextEventNamed("turbo:visit")
    await this.nextEventNamed("turbo:before-cache")
    await this.nextEventNamed("turbo:before-render")
    await this.nextEventNamed("turbo:render")
    await this.nextEventNamed("turbo:load")
  }

  async "test standard POST form submission toggles submitter [disabled] attribute"() {
    await this.clickSelector("#standard-post-form-submit")

    this.assert.equal(await this.nextAttributeMutationNamed("standard-post-form-submit", "disabled"), "", "sets [disabled] on the submitter")
    this.assert.equal(await this.nextAttributeMutationNamed("standard-post-form-submit", "disabled"), null, "removes [disabled] from the submitter")
  }

  async "test standard GET form submission"() {
    await this.clickSelector("#standard form.greeting input[type=submit]")
    await this.nextBody

    this.assert.ok(await this.formSubmitStarted)
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "advance")
    this.assert.equal(await this.getSearchParam("greeting"), "Hello from a form")
  }

  async "test standard GET form submission events"() {
    await this.clickSelector("#standard-get-form-submit")

    this.assert.ok(await this.formSubmitStarted, "fires turbo:submit-start")

    const { fetchOptions } = await this.nextEventNamed("turbo:before-fetch-request")

    this.assert.notOk(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))

    await this.nextEventNamed("turbo:before-fetch-response")

    this.assert.ok(await this.formSubmitEnded, "fires turbo:submit-end")

    await this.nextEventNamed("turbo:before-visit")
    await this.nextEventNamed("turbo:visit")
    await this.nextEventNamed("turbo:before-cache")
    await this.nextEventNamed("turbo:before-render")
    await this.nextEventNamed("turbo:render")
    await this.nextEventNamed("turbo:load")
  }

  async "test standard GET form submission toggles submitter [disabled] attribute"() {
    await this.clickSelector("#standard-get-form-submit")

    this.assert.equal(await this.nextAttributeMutationNamed("standard-get-form-submit", "disabled"), "", "sets [disabled] on the submitter")
    this.assert.equal(await this.nextAttributeMutationNamed("standard-get-form-submit", "disabled"), null, "removes [disabled] from the submitter")
  }

  async "test standard GET form submission appending keys"() {
    await this.goToLocation("/src/tests/fixtures/form.html?query=1")
    await this.clickSelector("#standard form.conflicting-values input[type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.getSearchParam("query"), "2")
  }

  async "test standard form submission with empty created response"() {
    const htmlBefore = await this.outerHTMLForSelector("body")
    const button = await this.querySelector("#standard form.created input[type=submit]")
    await button.click()
    await this.nextBeat

    const htmlAfter = await this.outerHTMLForSelector("body")
    this.assert.equal(htmlAfter, htmlBefore)
  }

  async "test standard form submission with empty no-content response"() {
    const htmlBefore = await this.outerHTMLForSelector("body")
    const button = await this.querySelector("#standard form.no-content input[type=submit]")
    await button.click()
    await this.nextBeat

    const htmlAfter = await this.outerHTMLForSelector("body")
    this.assert.equal(htmlAfter, htmlBefore)
  }

  async "test standard POST form submission with multipart/form-data enctype"() {
    await this.clickSelector("#standard form[method=post][enctype] input[type=submit]")
    await this.nextBeat

    const enctype = await this.getSearchParam("enctype")
    this.assert.ok(enctype?.startsWith("multipart/form-data"), "submits a multipart/form-data request")
  }

  async "test standard GET form submission ignores enctype"() {
    await this.clickSelector("#standard form[method=get][enctype] input[type=submit]")
    await this.nextBeat

    const enctype = await this.getSearchParam("enctype")
    this.assert.notOk(enctype, "GET form submissions ignore enctype")
  }

  async "test standard POST form submission without an enctype"() {
    await this.clickSelector("#standard form[method=post].no-enctype input[type=submit]")
    await this.nextBeat

    const enctype = await this.getSearchParam("enctype")
    this.assert.ok(enctype?.startsWith("application/x-www-form-urlencoded"), "submits a application/x-www-form-urlencoded request")
  }

  async "test no-action form submission with single parameter"() {
    await this.clickSelector("#no-action form.single input[type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.getSearchParam("query"), "1")

    await this.clickSelector("#no-action form.single input[type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.getSearchParam("query"), "1")

    await this.goToLocation("/src/tests/fixtures/form.html?query=2")
    await this.clickSelector("#no-action form.single input[type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.getSearchParam("query"), "1")
  }

  async "test no-action form submission with multiple parameters"() {
    await this.goToLocation("/src/tests/fixtures/form.html?query=2")
    await this.clickSelector("#no-action form.multiple input[type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.deepEqual(await this.getAllSearchParams("query"), [ "1", "2" ])

    await this.clickSelector("#no-action form.multiple input[type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.deepEqual(await this.getAllSearchParams("query"), [ "1", "2" ])
  }

  async "test no-action form submission submitter parameters"() {
    await this.clickSelector("#no-action form.button-param [type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.getSearchParam("query"), "1")
    this.assert.deepEqual(await this.getAllSearchParams("button"), [])

    await this.clickSelector("#no-action form.button-param [type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.getSearchParam("query"), "1")
    this.assert.deepEqual(await this.getAllSearchParams("button"), [])
  }

  async "test input named action with no action attribute"() {
    await this.clickSelector("#action-input form.no-action [type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.getSearchParam("action"), "1")
    this.assert.equal(await this.getSearchParam("query"), "1")
  }

  async "test input named action with action attribute"() {
    await this.clickSelector("#action-input form.action [type=submit]")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.getSearchParam("action"), "1")
    this.assert.equal(await this.getSearchParam("query"), "1")
  }

  async "test invalid form submission with unprocessable entity status"() {
    await this.clickSelector("#reject form.unprocessable_entity input[type=submit]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Unprocessable Entity", "renders the response HTML")
    this.assert.notOk(await this.hasSelector("#frame form.reject"), "replaces entire page")
  }

  async "test invalid form submission with long form"() {
    await this.scrollToSelector("#reject form.unprocessable_entity_with_tall_form input[type=submit]")
    await this.clickSelector("#reject form.unprocessable_entity_with_tall_form input[type=submit]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Unprocessable Entity", "renders the response HTML")
    this.assert(await this.isScrolledToTop(), "page is scrolled to the top")
    this.assert.notOk(await this.hasSelector("#frame form.reject"), "replaces entire page")
  }

  async "test invalid form submission with server error status"() {
    this.assert(await this.hasSelector("head > #form-fixture-styles"))
    await this.clickSelector("#reject form.internal_server_error input[type=submit]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Internal Server Error", "renders the response HTML")
    this.assert.notOk(await this.hasSelector("head > #form-fixture-styles"), "replaces head")
    this.assert.notOk(await this.hasSelector("#frame form.reject"), "replaces entire page")
  }

  async "test submitter form submission reads button attributes"() {
    const button = await this.querySelector("#submitter form button[type=submit]")
    await button.click()
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/two.html")
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test submitter POST form submission with multipart/form-data formenctype"() {
    await this.clickSelector("#submitter form[method=post]:not([enctype]) input[formenctype]")
    await this.nextBeat

    const enctype = await this.getSearchParam("enctype")
    this.assert.ok(enctype?.startsWith("multipart/form-data"), "submits a multipart/form-data request")
  }

  async "test submitter GET submission from submitter with data-turbo-frame"() {
    await this.clickSelector("#submitter form[method=get] [type=submit][data-turbo-frame]")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Form")
    this.assert.equal(await message.getVisibleText(), "Frame redirected")
  }

  async "test submitter POST submission from submitter with data-turbo-frame"() {
    await this.clickSelector("#submitter form[method=post] [type=submit][data-turbo-frame]")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Form")
    this.assert.equal(await message.getVisibleText(), "Frame redirected")
  }

  async "test frame form GET submission from submitter with data-turbo-frame=_top"() {
    await this.clickSelector("#frame form[method=get] [type=submit][data-turbo-frame=_top]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "One")
  }

  async "test frame form POST submission from submitter with data-turbo-frame=_top"() {
    await this.clickSelector("#frame form[method=post] [type=submit][data-turbo-frame=_top]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "One")
  }

  async "test frame POST form targetting frame submission"() {
    await this.clickSelector("#targets-frame-post-form-submit")

    this.assert.ok(await this.formSubmitStarted, "fires turbo:submit-start")

    const { fetchOptions } = await this.nextEventNamed("turbo:before-fetch-request")

    this.assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
    this.assert.equal("frame", fetchOptions.headers["Turbo-Frame"])

    await this.nextEventNamed("turbo:before-fetch-response")

    this.assert.ok(await this.formSubmitEnded, "fires turbo:submit-end")

    await this.nextEventNamed("turbo:frame-render")
    await this.nextEventNamed("turbo:frame-load")

    const otherEvents = await this.eventLogChannel.read()
    this.assert.equal(otherEvents.length, 0, "no more events")
  }

  async "test frame POST form targetting frame toggles submitter's [disabled] attribute"() {
    await this.clickSelector("#targets-frame-post-form-submit")

    this.assert.equal(await this.nextAttributeMutationNamed("targets-frame-post-form-submit", "disabled"), "", "sets [disabled] on the submitter")
    this.assert.equal(await this.nextAttributeMutationNamed("targets-frame-post-form-submit", "disabled"), null, "removes [disabled] from the submitter")
  }

  async "test frame GET form targetting frame submission"() {
    await this.clickSelector("#targets-frame-get-form-submit")

    this.assert.ok(await this.formSubmitStarted, "fires turbo:submit-start")

    const { fetchOptions } = await this.nextEventNamed("turbo:before-fetch-request")

    this.assert.notOk(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))
    this.assert.equal("frame", fetchOptions.headers["Turbo-Frame"])

    await this.nextEventNamed("turbo:before-fetch-response")

    this.assert.ok(await this.formSubmitEnded, "fires turbo:submit-end")

    await this.nextEventNamed("turbo:frame-render")
    await this.nextEventNamed("turbo:frame-load")

    const otherEvents = await this.eventLogChannel.read()
    this.assert.equal(otherEvents.length, 0, "no more events")
  }

  async "test frame GET form targetting frame toggles submitter's [disabled] attribute"() {
    await this.clickSelector("#targets-frame-get-form-submit")

    this.assert.equal(await this.nextAttributeMutationNamed("targets-frame-get-form-submit", "disabled"), "", "sets [disabled] on the submitter")
    this.assert.equal(await this.nextAttributeMutationNamed("targets-frame-get-form-submit", "disabled"), null, "removes [disabled] from the submitter")
  }

  async "test frame form GET submission from submitter referencing another frame"() {
    await this.clickSelector("#frame form[method=get] [type=submit][data-turbo-frame=hello]")
    await this.nextBeat

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#hello h2")
    this.assert.equal(await frameTitle.getVisibleText(), "Hello from a frame")
    this.assert.equal(await title.getVisibleText(), "Form")
  }

  async "test frame form POST submission from submitter referencing another frame"() {
    await this.clickSelector("#frame form[method=post] [type=submit][data-turbo-frame=hello]")
    await this.nextBeat

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#hello h2")
    this.assert.equal(await frameTitle.getVisibleText(), "Hello from a frame")
    this.assert.equal(await title.getVisibleText(), "Form")
  }

  async "test frame form submission with redirect response"() {
    const path = await this.attributeForSelector("#frame form.redirect input[name=path]", "value") || ""
    const url = new URL(path, "http://localhost:9000")
    url.searchParams.set("enctype", "application/x-www-form-urlencoded;charset=UTF-8")

    const button = await this.querySelector("#frame form.redirect input[type=submit]")
    await button.click()
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.notOk(await this.hasSelector("#frame form.redirect"))
    this.assert.equal(await message.getVisibleText(), "Frame redirected")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html", "does not redirect _top")
    this.assert.notOk(await this.search, "does not redirect _top")
    this.assert.equal(await this.attributeForSelector("#frame", "src"), url.href, "redirects the target frame")
  }

  async "test frame form submission toggles the ancestor frame's [aria-busy] attribute"() {
    await this.clickSelector("#frame form.redirect input[type=submit]")
    await this.nextBeat

    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), "", "sets [busy] on the #frame")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "aria-busy"), "true", "sets [aria-busy] on the #frame")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), null, "removes [busy] from the #frame")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "aria-busy"), null, "removes [aria-busy] from the #frame")
  }

  async "test frame form submission toggles the target frame's [aria-busy] attribute"() {
    await this.clickSelector('#targets-frame form.frame [type="submit"]')
    await this.nextBeat

    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), "", "sets [busy] on the #frame")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "aria-busy"), "true", "sets [aria-busy] on the #frame")

    const title = await this.querySelector("#frame h2")
    this.assert.equal(await title.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), null, "removes [busy] from the #frame")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "aria-busy"), null, "removes [aria-busy] from the #frame")
  }

  async "test frame form submission with empty created response"() {
    const htmlBefore = await this.outerHTMLForSelector("#frame")
    const button = await this.querySelector("#frame form.created input[type=submit]")
    await button.click()
    await this.nextBeat

    const htmlAfter = await this.outerHTMLForSelector("#frame")
    this.assert.equal(htmlAfter, htmlBefore)
  }

  async "test frame form submission with empty no-content response"() {
    const htmlBefore = await this.outerHTMLForSelector("#frame")
    const button = await this.querySelector("#frame form.no-content input[type=submit]")
    await button.click()
    await this.nextBeat

    const htmlAfter = await this.outerHTMLForSelector("#frame")
    this.assert.equal(htmlAfter, htmlBefore)
  }

  async "test frame form submission within a frame submits the Turbo-Frame header"() {
    await this.clickSelector("#frame form.redirect input[type=submit]")

    const { fetchOptions } = await this.nextEventNamed("turbo:before-fetch-request")

    this.assert.ok(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header")
  }

  async "test invalid frame form submission with unprocessable entity status"() {
    await this.clickSelector("#frame form.unprocessable_entity input[type=submit]")

    this.assert.ok(await this.formSubmitStarted, "fires turbo:submit-start")
    await this.nextEventNamed("turbo:before-fetch-request")
    await this.nextEventNamed("turbo:before-fetch-response")
    this.assert.ok(await this.formSubmitEnded, "fires turbo:submit-end")
    await this.nextEventNamed("turbo:frame-render")
    await this.nextEventNamed("turbo:frame-load")

    const otherEvents = await this.eventLogChannel.read()
    this.assert.equal(otherEvents.length, 0, "no more events")

    const title = await this.querySelector("#frame h2")
    this.assert.ok(await this.hasSelector("#reject form"), "only replaces frame")
    this.assert.equal(await title.getVisibleText(), "Frame: Unprocessable Entity")
  }

  async "test invalid frame form submission with internal server errror status"() {
    await this.clickSelector("#frame form.internal_server_error input[type=submit]")

    this.assert.ok(await this.formSubmitStarted, "fires turbo:submit-start")
    await this.nextEventNamed("turbo:before-fetch-request")
    await this.nextEventNamed("turbo:before-fetch-response")
    this.assert.ok(await this.formSubmitEnded, "fires turbo:submit-end")
    await this.nextEventNamed("turbo:frame-render")
    await this.nextEventNamed("turbo:frame-load")

    const otherEvents = await this.eventLogChannel.read()
    this.assert.equal(otherEvents.length, 0, "no more events")

    const title = await this.querySelector("#frame h2")
    this.assert.ok(await this.hasSelector("#reject form"), "only replaces frame")
    this.assert.equal(await title.getVisibleText(), "Frame: Internal Server Error")
  }

  async "test frame form submission with stream response"() {
    const button = await this.querySelector("#frame form.stream input[type=submit]")
    await button.click()
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.ok(await this.hasSelector("#frame form.redirect"))
    this.assert.equal(await message.getVisibleText(), "Hello!")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
  }

  async "test frame form submission with HTTP verb other than GET or POST"() {
    await this.clickSelector("#frame form.put.stream input[type=submit]")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.ok(await this.hasSelector("#frame form.redirect"))
    this.assert.equal(await message.getVisibleText(), "1: Hello!")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
  }

  async "test frame form submission with [data-turbo=false] on the form"() {
    await this.clickSelector('#frame form[data-turbo="false"] input[type=submit]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.formSubmitStarted)
  }

  async "test frame form submission with [data-turbo=false] on the submitter"() {
    await this.clickSelector('#frame form:not([data-turbo]) input[data-turbo="false"]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.formSubmitStarted)
  }

  async "test form submission with [data-turbo=false] on the form"() {
    await this.clickSelector('#turbo-false form[data-turbo="false"] input[type=submit]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.formSubmitStarted)
  }

  async "test form submission with [data-turbo=false] on the submitter"() {
    await this.clickSelector('#turbo-false form:not([data-turbo]) input[data-turbo="false"]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.formSubmitStarted)
  }

  async "test form submission skipped within method=dialog"() {
    await this.clickSelector('#dialog-method [type="submit"]')
    await this.nextBeat

    this.assert.notOk(await this.formSubmitStarted)
  }

  async "test form submission skipped with submitter formmethod=dialog"() {
    await this.clickSelector('#dialog-formmethod [formmethod="dialog"]')
    await this.nextBeat

    this.assert.notOk(await this.formSubmitStarted)
  }

  async "test form submission targets disabled frame"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("disabled", ""))
    await this.clickSelector('#targets-frame form.one [type="submit"]')
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
  }

  async "test form submission targeting a frame submits the Turbo-Frame header"() {
    await this.clickSelector('#targets-frame [type="submit"]')

    const { fetchOptions } = await this.nextEventNamed("turbo:before-fetch-request")

    this.assert.ok(fetchOptions.headers["Turbo-Frame"], "submits with the Turbo-Frame header")
  }

  async "test link method form submission inside frame"() {
    await this.clickSelector("#link-method-inside-frame")
    await this.nextBeat

    const title = await this.querySelector("#frame h2")
    this.assert.equal(await title.getVisibleText(), "Frame: Loaded")
    this.assert.notOk(await this.hasSelector("#nested-child"))
  }

  async "test link method form submission inside frame with data-turbo-frame=_top"() {
    await this.clickSelector("#link-method-inside-frame-target-top")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Hello")
  }

  async "test link method form submission inside frame with data-turbo-frame target"() {
    await this.clickSelector("#link-method-inside-frame-with-target")
    await this.nextBeat

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#hello h2")
    this.assert.equal(await frameTitle.getVisibleText(), "Hello from a frame")
    this.assert.equal(await title.getVisibleText(), "Form")
  }

  async "test stream link method form submission inside frame"() {
    await this.clickSelector("#stream-link-method-inside-frame")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.equal(await message.getVisibleText(), "Link!")
  }

  async "test link method form submission within form inside frame"() {
    await this.clickSelector("#stream-link-method-within-form-inside-frame")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.equal(await message.getVisibleText(), "Link!")
  }

  async "test link method form submission inside frame with confirmation confirmed"() {
    await this.clickSelector("#link-method-inside-frame-with-confirmation")

    this.assert.equal(await this.getAlertText(), "Are you sure?")
    await this.acceptAlert()

    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.equal(await message.getVisibleText(), "Link!")
  }

  async "test link method form submission inside frame with confirmation cancelled"() {
    await this.clickSelector("#link-method-inside-frame-with-confirmation")

    this.assert.equal(await this.getAlertText(), "Are you sure?")
    await this.dismissAlert()

    await this.nextBeat

    this.assert.notOk(await this.hasSelector("#frame div.message"), "Not confirming form submission does not submit the form")
  }

  async "test link method form submission outside frame"() {
    await this.clickSelector("#link-method-outside-frame")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Hello")
  }

  async "test stream link method form submission outside frame"() {
    await this.clickSelector("#stream-link-method-outside-frame")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.equal(await message.getVisibleText(), "Link!")
  }

  async "test link method form submission within form outside frame"() {
    await this.clickSelector("#link-method-within-form-outside-frame")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Hello")
  }

  async "test stream link method form submission within form outside frame"() {
    await this.clickSelector("#stream-link-method-within-form-outside-frame")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.equal(await message.getVisibleText(), "Link!")
  }

  async "test turbo:before-fetch-request fires on the form element"() {
    await this.clickSelector('#targets-frame form.one [type="submit"]')
    this.assert.ok(await this.nextEventOnTarget("form_one", "turbo:before-fetch-request"))
  }

  async "test turbo:before-fetch-response fires on the form element"() {
    await this.clickSelector('#targets-frame form.one [type="submit"]')
    this.assert.ok(await this.nextEventOnTarget("form_one", "turbo:before-fetch-response"))
  }

  async "test POST to external action ignored"() {
    await this.clickSelector("#submit-external")
    await this.noNextEventNamed("turbo:before-fetch-request")
    await this.nextBody

    this.assert.equal(await this.location, "https://httpbin.org/post")
  }

  async "test POST to external action within frame ignored"() {
    await this.clickSelector("#submit-external-within-ignored")
    await this.noNextEventNamed("turbo:before-fetch-request")
    await this.nextBody

    this.assert.equal(await this.location, "https://httpbin.org/post")
  }

  async "test POST to external action targetting frame ignored"() {
    await this.clickSelector("#submit-external-target-ignored")
    await this.noNextEventNamed("turbo:before-fetch-request")
    await this.nextBody

    this.assert.equal(await this.location, "https://httpbin.org/post")
  }

  get formSubmitStarted(): Promise<boolean> {
    return this.hasSelector("html[data-form-submit-start]")
  }

  get formSubmitEnded(): Promise<boolean> {
    return this.hasSelector("html[data-form-submit-end]")
  }
}

FormSubmissionTests.registerSuite()
