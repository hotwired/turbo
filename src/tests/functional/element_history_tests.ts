import { FunctionalTestCase } from "../helpers/functional_test_case"

export class ElementHistoryTests extends FunctionalTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frames.html")
  }

  async "test frame link with a history data attribute updates the location"() {
    await this.clickSelector("#history a")
    await this.nextBeat

    const frameText = await this.querySelector("#history h2")
    this.assert.equal(await frameText.getVisibleText(), "History frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test frame link with a history data attribute defaults to pushState"() {
    await this.clickSelector("#history a")
    await this.nextBeat

    const frameText = await this.querySelector("#history h2")
    this.assert.equal(await frameText.getVisibleText(), "History frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")

    await this.goBack();
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames.html")
  }

  async "test frame link with a history data attribute can replaceState"() {
    await this.clickSelector("#history a")
    await this.nextBeat

    let frameText = await this.querySelector("#history h2")
    this.assert.equal(await frameText.getVisibleText(), "History frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")

    await this.clickSelector("#replace")
    await this.nextBeat
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")

    await this.goBack();
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames.html")
  }

  async "test frame link with a history url data attribute can override the location"() {
    await this.clickSelector("#special-url")
    await this.nextBeat

    this.assert.equal(await this.pathname, "/special")
  }

  async "test link outside frame with a history data attribute updates the location"() {
    await this.clickSelector("#history-link")
    await this.nextBeat

    const frameText = await this.querySelector("#history h2")
    this.assert.equal(await frameText.getVisibleText(), "History frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test frame form submission updates location to the form action"() {
    await this.goToLocation("/src/tests/fixtures/form.html")

    const button = await this.querySelector("#frame .history form.created input[type=submit]")
    await button.click()
    await this.nextBeat

    this.assert.equal(await this.pathname, "/__turbo/messages")
  }

  async "test frame form submission updates location to the redirect url response"() {
    await this.goToLocation("/src/tests/fixtures/form.html")

    const button = await this.querySelector("#frame .history form.redirect input[type=submit]")
    await button.click()
    await this.nextBeat

    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/hello.html")
  }

  async "test frame form submission without successful response does not update location"() {
    await this.goToLocation("/src/tests/fixtures/form.html")

    const button = await this.querySelector("#frame .history form.unprocessable_entity input[type=submit]")
    await button.click()
    await this.nextBeat

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
  }

  async "test frame form submission data history url attribute can override the form action"() {
    await this.goToLocation("/src/tests/fixtures/form.html")

    const button = await this.querySelector("#frame .history form.override input[type=submit]")
    await button.click()
    await this.nextBeat

    this.assert.equal(await this.pathname, "/override")
  }

  async "test form submission outside frame updates location to the form action"() {
    await this.goToLocation("/src/tests/fixtures/form.html")

    const button = await this.querySelector("#targets-frame .history [type=submit]")
    await button.click()
    await this.nextBeat

    this.assert.equal(await this.pathname, "/__turbo/messages")
  }

  async "test stream element with a history data attribute can update the location with pushState"() {
    await this.goToLocation("/src/tests/fixtures/form.html")

    const button = await this.querySelector("#frame .history form.stream input[type=submit]")
    await button.click()
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.equal(await message.getVisibleText(), "Hello!")

    this.assert.equal(await this.pathname, "/stream_url")

    await this.goBack()

    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
  }
}

ElementHistoryTests.registerSuite()
