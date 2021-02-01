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

    await this.createMessage("Hello CSS!", ".messages")
    await this.nextBeat

    element = await this.querySelectorAll(selector)
    this.assert.equal(await element[0].getVisibleText(), "Hello CSS!")
    this.assert.equal(await element[1].getVisibleText(), "Hello CSS!")
  }
  
  async createMessage(content: string, target?: string) {
    return this.post("/__turbo/messages", { content , target})
  }

  async post(path: string, params: any = {}) {
    await this.evaluate((path, method, params) => {
      fetch(location.origin + path, { method, body: new URLSearchParams(params) })
    }, path, "POST", params)
  }
}

StreamTests.registerSuite()
