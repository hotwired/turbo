import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FormSubmissionTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/form.html")
  }

  async "test standard form submission with redirect response"() {
    const button = await this.querySelector("#standard form input[type=submit]")
    await button.click()
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "advance")
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

  async "test frame form submission with redirect response"() {
    const button = await this.querySelector("#frame form.redirect input[type=submit]")
    await button.click()
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.notOk(await this.hasSelector("#frame form.redirect"))
    this.assert.equal(await message.getVisibleText(), "Frame redirected")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
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
}

FormSubmissionTests.registerSuite()
