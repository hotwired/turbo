import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class UnobtrusiveJavaScriptTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/unobtrusive_javascript.html")
  }

  async "test data-disable-with"() {
    await this.clickSelector("a[data-disable-with]")
    await this.nextBeat

    const link = await this.querySelector("a[data-disable-with]")
    this.assert.equal(await link.getVisibleText(), "Visiting")

    await this.clickSelector("form button[data-disable-with]")
    await this.nextBeat

    const button = await this.querySelector("form button[disabled][data-disable-with]")
    this.assert.equal(await button.getVisibleText(), "Clicked")
  }
}

UnobtrusiveJavaScriptTests.registerSuite()
