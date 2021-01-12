import { FunctionalTestCase } from "../helpers/functional_test_case"

export class FrameTests extends FunctionalTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frames.html")
  }

  async "test following a link to a page without a matching frame results in an empty frame"() {
    await this.clickSelector("#missing a")
    await this.nextBeat
    this.assert.notOk(await this.innerHTMLForSelector("#missing"))
  }
}

FrameTests.registerSuite()
