import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

declare const Turbo: any

export class PingTests extends TurboDriveTestCase {
  async "test pinging when clicking a link"() {
    await this.clickSelector("")
  }
}
