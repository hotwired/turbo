import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class DriveTests extends TurboDriveTestCase {
  path = "/src/tests/fixtures/drive.html"

  async setup() {
    await this.goToLocation(this.path)
  }

  async "test drive enabled by default; click normal link"() {
    this.clickSelector("#drive_enabled")
    await this.nextBody
    this.assert.equal(await this.pathname, this.path)
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test drive to external link"() {
    this.clickSelector("#drive_enabled_external")
    await this.nextBody
    this.assert.equal(await this.remote.execute(() => window.location.href), "https://example.com/")
  }

  async "test drive enabled by default; click link inside data-turbo='false'"() {
    this.clickSelector("#drive_disabled")
    await this.nextBody
    this.assert.equal(await this.pathname, this.path)
    this.assert.equal(await this.visitAction, "load")
  }
}

DriveTests.registerSuite()
