import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class PausableRenderingTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/pausable_rendering.html")
  }

  async "test pauses and resumes rendering"() {
    await this.clickSelector("#link")

    await this.nextBeat
    this.assert.strictEqual(await this.getAlertText(), 'Continue rendering?')
    await this.acceptAlert()

    const h1 = await this.querySelector("h1")
    this.assert.equal(await h1.getVisibleText(), "One")
  }

  async "test aborts rendering"() {
    await this.clickSelector("#link")

    await this.nextBeat
    this.assert.strictEqual(await this.getAlertText(), 'Continue rendering?')
    await this.dismissAlert()

    await this.nextBeat
    this.assert.strictEqual(await this.getAlertText(), 'Rendering aborted')
    await this.acceptAlert()

    const h1 = await this.querySelector("h1")
    this.assert.equal(await h1.getVisibleText(), "Pausable Rendering")
  }
}

PausableRenderingTests.registerSuite()
