import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FormSubmissionTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/form.html")
    await this.remote.execute(() => {
      addEventListener("turbo:submit-start", () => document.documentElement.setAttribute("data-form-submitted", ""), { once: true })
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

  async "test standard form submission does not render a progress bar before expiring the delay"() {
    await this.remote.execute(() => window.Turbo.setProgressBarDelay(500))
    await this.clickSelector("#standard form.redirect input[type=submit]")

    this.assert.notOk(await this.hasSelector(".turbo-progress-bar"), "does not show progress bar before delay")
  }

  async "test standard form submission with redirect response"() {
    await this.clickSelector("#standard form.redirect input[type=submit]")
    await this.nextBody

    this.assert.ok(await this.formSubmitted)
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.visitAction, "advance")
    this.assert.equal(await this.getSearchParam("greeting"), "Hello from a redirect")
  }

  async "test standard GET form submission"() {
    await this.clickSelector("#standard form.greeting input[type=submit]")
    await this.nextBody

    this.assert.notOk(await this.formSubmitted)
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "replace")
    this.assert.equal(await this.getSearchParam("greeting"), "Hello from a form")
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

  async "test frame form submission toggles the ancestor frame's [busy] attribute"() {
    await this.clickSelector("#frame form.redirect input[type=submit]")
    await this.nextBeat

    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), "", "sets [busy] on the #frame")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), null, "removes [busy] from the #frame")
  }

  async "test frame form submission toggles the target frame's [busy] attribute"() {
    await this.clickSelector('#targets-frame form.frame [type="submit"]')
    await this.nextBeat

    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), "", "sets [busy] on the #frame")

    const title = await this.querySelector("#frame h2")
    this.assert.equal(await title.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), null, "removes [busy] from the #frame")
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
    await this.nextBeat

    const title = await this.querySelector("#frame h2")
    this.assert.ok(await this.hasSelector("#reject form"), "only replaces frame")
    this.assert.equal(await title.getVisibleText(), "Frame: Unprocessable Entity")
  }

  async "test invalid frame form submission with internal server errror status"() {
    await this.clickSelector("#frame form.internal_server_error input[type=submit]")
    await this.nextBeat

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

    this.assert.notOk(await this.formSubmitted)
  }

  async "test frame form submission with [data-turbo=false] on the submitter"() {
    await this.clickSelector('#frame form:not([data-turbo]) input[data-turbo="false"]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.formSubmitted)
  }

  async "test form submission with [data-turbo=false] on the form"() {
    await this.clickSelector('#turbo-false form[data-turbo="false"] input[type=submit]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.formSubmitted)
  }

  async "test form submission with [data-turbo=false] on the submitter"() {
    await this.clickSelector('#turbo-false form:not([data-turbo]) input[data-turbo="false"]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.formSubmitted)
  }

  async "test form submission skipped within method=dialog"() {
    await this.clickSelector('#dialog-method [type="submit"]')
    await this.nextBeat

    this.assert.notOk(await this.formSubmitted)
  }

  async "test form submission skipped with submitter formmethod=dialog"() {
    await this.clickSelector('#dialog-formmethod [formmethod="dialog"]')
    await this.nextBeat

    this.assert.notOk(await this.formSubmitted)
  }

  async "test form submission targets disabled frame"() {
    this.remote.execute(() => document.getElementById("frame")?.setAttribute("disabled", ""))
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

    const message = await this.querySelector("#frame div.message")
    this.assert.equal(await message.getVisibleText(), "Link!")
  }

  async "test link method form submission outside frame"() {
    await this.clickSelector("#link-method-outside-frame")

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

  get formSubmitted(): Promise<boolean> {
    return this.hasSelector("html[data-form-submitted]")
  }
}

FormSubmissionTests.registerSuite()
