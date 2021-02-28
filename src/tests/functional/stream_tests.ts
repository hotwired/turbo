import { FunctionalTestCase } from "../helpers/functional_test_case"

export class StreamTests extends FunctionalTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/stream.html")
  }

  async "test receiving a stream message"() {
    let element
    const selector = "#messages div.message:last-child"

    element = await this.querySelector(selector)
    this.assert.equal(await element.getVisibleText(), "Third")

    await this.clickSelector("#append_messages [type=submit]")
    await this.nextBeat

    element = await this.querySelector(selector)
    this.assert.equal(await element.getVisibleText(), "Hello world!")
  }

  async "test append for an existing element first removes the element, then appends"() {
    let firstMessage = await this.querySelector("#messages div.message:first-child")
    let lastMessage = await this.querySelector("#messages div.message:last-child")

    this.assert.equal(await firstMessage.getVisibleText(), "First")
    this.assert.equal(await lastMessage.getVisibleText(), "Third")

    await this.clickSelector("#append_message_1 [type=submit]")
    await this.nextBeat

    firstMessage = await this.querySelector("#messages div.message:first-child")
    lastMessage = await this.querySelector("#messages div.message:last-child")

    this.assert.equal(await firstMessage.getVisibleText(), "Second", "removes element prior to append")
    this.assert.equal(await lastMessage.getVisibleText(), "Hello world!", "appends the element")
  }

  async "test prepend for an existing element first removes the element, then prepends"() {
    let firstMessage = await this.querySelector("#messages div.message:first-child")
    let lastMessage = await this.querySelector("#messages div.message:last-child")

    this.assert.equal(await firstMessage.getVisibleText(), "First")
    this.assert.equal(await lastMessage.getVisibleText(), "Third")

    await this.clickSelector("#prepend_message_3 [type=submit]")
    await this.nextBeat

    firstMessage = await this.querySelector("#messages div.message:first-child")
    lastMessage = await this.querySelector("#messages div.message:last-child")

    this.assert.equal(await firstMessage.getVisibleText(), "Hello world!", "prepends the element")
    this.assert.equal(await lastMessage.getVisibleText(), "Second", "removes element prior to prepends")
  }
}

StreamTests.registerSuite()
