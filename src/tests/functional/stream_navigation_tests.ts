import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class StreamNavigationTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/stream.html")
  }

  async "test dispatches the 'turbo:before-stream-render' and 'turbo:after-stream-render' events"() {
    await this.clickSelector("#replaceSecond [type=submit]")

    await this.nextEventNamed("turbo:before-stream-render")
    await this.nextEventOnTarget("message_2", "turbo:after-stream-render")
  }
}

StreamNavigationTests.registerSuite()
