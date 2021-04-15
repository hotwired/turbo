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

  async "test receiving a stream message with a custom action"() {
    this.assert.notOk(await this.hasSelector("#messages marquee"))

    await this.clickSelector("#custom-action [type=submit]")
    await this.nextBeat

    this.assert.ok(await this.hasSelector("#messages marquee"))
  }
}

StreamTests.registerSuite()
