import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FrameNavigationTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frame_navigation.html")
  }

  async "test frame navigation with descendant link"() {
    await this.clickSelector("#inside")

    await this.nextEventOnTarget("frame", "turbo:frame-load")
  }

  async "test frame navigation with self link"() {
    await this.clickSelector("#self")

    await this.nextEventOnTarget("frame", "turbo:frame-load")
  }

  async "test frame navigation with exterior link"() {
    await this.clickSelector("#outside")

    await this.nextEventOnTarget("frame", "turbo:frame-load")
  }
}

FrameNavigationTests.registerSuite()
