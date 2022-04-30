import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class PausableRequestsTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/pausable_requests.html")
  }

  async "test pauses and resumes request"() {
    await this.clickSelector("#link")

    await this.nextBeat
    this.assert.strictEqual(await this.getAlertText(), "Continue request?")
    await this.acceptAlert()

    await this.nextBeat
    const h1 = await this.querySelector("h1")
    this.assert.equal(await h1.getVisibleText(), "One")
  }

  async "test aborts request"() {
    await this.clickSelector("#link")

    await this.nextBeat
    this.assert.strictEqual(await this.getAlertText(), "Continue request?")
    await this.dismissAlert()

    await this.nextBeat
    this.assert.strictEqual(await this.getAlertText(), "Request aborted")
    await this.acceptAlert()

    await this.nextBeat
    const h1 = await this.querySelector("h1")
    this.assert.equal(await h1.getVisibleText(), "Pausable Requests")
  }
}

PausableRequestsTests.registerSuite()
