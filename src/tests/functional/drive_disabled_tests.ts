import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class DriveDisabledTests extends TurboDriveTestCase {
  path = "/src/tests/fixtures/drive_disabled.html"

  async setup() {
    await this.goToLocation(this.path)
  }

  async "test drive disabled by default; click normal link"() {
    this.clickSelector("#drive_disabled")
    await this.nextBody
    this.assert.equal(await this.pathname, this.path)
    this.assert.equal(await this.visitAction, "load")
  }

  async "test drive disabled by default; click link inside data-turbo='true'"() {
    this.clickSelector("#drive_enabled")
    await this.nextBody
    this.assert.equal(await this.pathname, this.path)
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test drive disabled by default; submit form inside data-turbo='true'"() {
    await this.remote.execute(() => {
      addEventListener("turbo:submit-start", () => document.documentElement.setAttribute("data-form-submitted", ""), { once: true })
    })
    this.clickSelector("#no_submitter_drive_enabled a#requestSubmit")
    await this.nextBody
    this.assert.ok(await this.formSubmitted)
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
    this.assert.equal(await this.visitAction, "advance")
    this.assert.equal(await this.getSearchParam("greeting"), "Hello from a redirect")
  }

  get formSubmitted(): Promise<boolean> {
    return this.hasSelector("html[data-form-submitted]")
  }
}


DriveDisabledTests.registerSuite()
