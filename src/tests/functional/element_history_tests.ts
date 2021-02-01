import { FunctionalTestCase } from "../helpers/functional_test_case"

export class ElementHistoryTests extends FunctionalTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frames.html")
  }

  async "test following a link within a frame with a target set navigates the target frame"() {
    await this.clickSelector("#history a")
    await this.nextBeat

    const frameText = await this.querySelector("#history h2")
    this.assert.equal(await frameText.getVisibleText(), "History frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

}

ElementHistoryTests.registerSuite()
