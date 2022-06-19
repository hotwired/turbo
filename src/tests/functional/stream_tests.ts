import { FunctionalTestCase } from "../helpers/functional_test_case"

export class StreamTests extends FunctionalTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/stream.html")
  }

  async "test receiving a stream message"() {
    let element
    const selector = "#messages div.message:last-child"

    element = await this.querySelector(selector)
    this.assert.equal(await element.getVisibleText(), "First")

    await this.clickSelector("#create [type=submit]")
    await this.nextBeat

    element = await this.querySelector(selector)
    this.assert.equal(await element.getVisibleText(), "Hello world!")
  }

  async "test receiving a stream message with css selector target"() {
    let element
    const selector = ".messages div.message:last-child"

    element = await this.querySelectorAll(selector)
    this.assert.equal(await element[0].getVisibleText(), "Second")
    this.assert.equal(await element[1].getVisibleText(), "Third")

    await this.clickSelector("#replace [type=submit]")
    await this.nextBeat

    element = await this.querySelectorAll(selector)
    this.assert.equal(await element[0].getVisibleText(), "Hello CSS!")
    this.assert.equal(await element[1].getVisibleText(), "Hello CSS!")
  }

  async "test receiving a stream message asynchronously"() {
    let messages = await this.querySelectorAll("#messages > *")

    this.assert.ok(messages[0])
    this.assert.notOk(messages[1], "receives streams when connected")
    this.assert.notOk(messages[2], "receives streams when connected")

    await this.clickSelector("#async button")
    await this.nextBeat

    messages = await this.querySelectorAll("#messages > *")

    this.assert.ok(messages[0])
    this.assert.ok(messages[1], "receives streams when connected")
    this.assert.notOk(messages[2], "receives streams when connected")

    await this.evaluate(() => document.getElementById("stream-source")?.remove())
    await this.nextBeat

    await this.clickSelector("#async button")
    await this.nextBeat

    messages = await this.querySelectorAll("#messages > *")

    this.assert.ok(messages[0])
    this.assert.ok(messages[1], "receives streams when connected")
    this.assert.notOk(messages[2], "does not receive streams when disconnected")
  }
}

StreamTests.registerSuite()
