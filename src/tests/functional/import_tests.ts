import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class ImportTests extends TurboDriveTestCase {
  async "test window variable with ESM"() {
    await this.goToLocation("/src/tests/fixtures/esm.html")
    const type = await this.evaluate(() => {
      return typeof window.Turbo
    })
    this.assert.equal(type, "object")
  }
}

ImportTests.registerSuite()
