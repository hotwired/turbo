import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FormSubmissionTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/form.html")
    await this.remote.execute(() => {
      addEventListener("turbo:submit-start", () => document.documentElement.setAttribute("data-form-submitted", ""), { once: true })
    })
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
    this.assert.equal(await this.visitAction, "advance")
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

  async "test invalid form submission with unprocessable entity status"() {
    await this.clickSelector("#reject form.unprocessable_entity input[type=submit]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Unprocessable Entity", "renders the response HTML")
    this.assert.notOk(await this.hasSelector("#frame form.reject"), "replaces entire page")
  }

  async "test invalid form submission with server error status"() {
    await this.clickSelector("#reject form.internal_server_error input[type=submit]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.equal(await title.getVisibleText(), "Internal Server Error", "renders the response HTML")
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
    await this.clickSelector('#targets-frame [type="submit"]')
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
  }

  get formSubmitted(): Promise<boolean> {
    return this.hasSelector("html[data-form-submitted]")
  }
}

FormSubmissionTests.registerSuite()
