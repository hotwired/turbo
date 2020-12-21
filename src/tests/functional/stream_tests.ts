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

    await this.createMessage("Hello world!")
    await this.nextBeat

    element = await this.querySelector(selector)
    this.assert.equal(await element.getVisibleText(), "Hello world!")
  }

  async createMessage(content: string) {
    return this.post("/__turbo/messages", { content })
  }

  async post(path: string, params: any = {}) {
    await this.evaluate((path, method, params) => {
      fetch(location.origin + path, { method, body: new URLSearchParams(params) })
    }, path, "POST", params)
  }
}

StreamTests.registerSuite()
