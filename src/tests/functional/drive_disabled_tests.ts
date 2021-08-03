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
}


DriveDisabledTests.registerSuite()
