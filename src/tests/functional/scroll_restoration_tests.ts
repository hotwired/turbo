import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class ScrollRestorationTests extends TurboDriveTestCase {
  async "test landing on an anchor"() {
    await this.goToLocation("/src/tests/fixtures/scroll_restoration.html#three")
    await this.nextBody
    const { y: yAfterLoading } = await this.scrollPosition
    this.assert.notEqual(yAfterLoading, 0)
  }

  async "test reloading after scrolling"() {
    await this.goToLocation("/src/tests/fixtures/scroll_restoration.html")
    await this.scrollToSelector("#three")
    const { y: yAfterScrolling } = await this.scrollPosition
    this.assert.notEqual(yAfterScrolling, 0)

    await this.reload()
    const { y: yAfterReloading } = await this.scrollPosition
    this.assert.notEqual(yAfterReloading, 0)
  }

  async "test returning from history"() {
    await this.goToLocation("/src/tests/fixtures/scroll_restoration.html")
    await this.scrollToSelector("#three")
    await this.goToLocation("/src/tests/fixtures/bare.html")
    await this.goBack()

    const { y: yAfterReturning } = await this.scrollPosition
    this.assert.notEqual(yAfterReturning, 0)
  }
}

ScrollRestorationTests.registerSuite()
