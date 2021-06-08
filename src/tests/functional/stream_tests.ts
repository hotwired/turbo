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
}

StreamTests.registerSuite()
