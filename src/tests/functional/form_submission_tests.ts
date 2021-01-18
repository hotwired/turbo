import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FormSubmissionTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/form.html")
  }

  async "test standard form submission with redirect response"() {
    this.listenForFormSubmissions()
    const button = await this.querySelector("#standard form.redirect input[type=submit]")
    await button.click()
    await this.nextBody

    this.assert.ok(this.turboFormSubmitted)
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "advance")
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

    const enctype = (await this.searchParams).get("enctype")
    this.assert.ok(enctype?.startsWith("multipart/form-data"), "submits a multipart/form-data request")
  }

  async "test standard GET form submission ignores enctype"() {
    await this.clickSelector("#standard form[method=get][enctype] input[type=submit]")
    await this.nextBeat

    const enctype = (await this.searchParams).get("enctype")
    this.assert.notOk(enctype, "GET form submissions ignore enctype")
  }

  async "test standard POST form submission without an enctype"() {
    await this.clickSelector("#standard form[method=post].no-enctype input[type=submit]")
    await this.nextBeat

    const enctype = (await this.searchParams).get("enctype")
    this.assert.ok(enctype?.startsWith("application/x-www-form-urlencoded"), "submits a application/x-www-form-urlencoded request")
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

    const enctype = (await this.searchParams).get("enctype")
    this.assert.ok(enctype?.startsWith("multipart/form-data"), "submits a multipart/form-data request")
  }

  async "test frame form submission with redirect response"() {
    const button = await this.querySelector("#frame form.redirect input[type=submit]")
    await button.click()
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.notOk(await this.hasSelector("#frame form.redirect"))
    this.assert.equal(await message.getVisibleText(), "Frame redirected")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
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

  async "test form submission with Turbo disabled on the form"() {
    this.listenForFormSubmissions()
    await this.clickSelector('#disabled form[data-turbo="false"] input[type=submit]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.turboFormSubmitted)
  }

  async "test form submission with Turbo disabled on the submitter"() {
    this.listenForFormSubmissions()
    await this.clickSelector('#disabled form:not([data-turbo]) input[data-turbo="false"]')
    await this.nextBody
    await this.querySelector("#element-id")

    this.assert.notOk(await this.turboFormSubmitted)
  }

  async "test form submission skipped within method=dialog"() {
    this.listenForFormSubmissions()
    await this.clickSelector('#dialog-method [type="submit"]')
    await this.nextBeat

    this.assert.notOk(await this.turboFormSubmitted)
  }

  async "test form submission skipped with submitter formmethod=dialog"() {
    this.listenForFormSubmissions()
    await this.clickSelector('#dialog-formmethod [formmethod="dialog"]')
    await this.nextBeat

    this.assert.notOk(await this.turboFormSubmitted)
  }

  listenForFormSubmissions() {
    this.remote.execute(() => addEventListener("turbo:submit-start", function eventListener(event) {
      removeEventListener("turbo:submit-start", eventListener, false)
      document.head.insertAdjacentHTML("beforeend", `<meta name="turbo-form-submitted">`)
    }, false))
  }

  get turboFormSubmitted(): Promise<boolean> {
    return this.hasSelector("meta[name=turbo-form-submitted]")
  }
}

FormSubmissionTests.registerSuite()
