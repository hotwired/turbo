import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class PreloadingTests extends TurboDriveTestCase {
  async "test demonstrates preloaded snapshot from cold start"() {
    await this.goToLocation("/src/tests/fixtures/preloading.html")
    await this.clickSelector("#preload_anchor")
    this.assert(await this.hasSelector("[data-turbo-preview]"))
  }

  async "test demonstrates preloaded snapshot from hot navigation"() {
    await this.goToLocation("/src/tests/fixtures/hot_preloading.html")
    await this.clickSelector("#hot_preload_anchor")
    await this.waitUntilSelector("#preload_anchor")
    await this.clickSelector("#preload_anchor")
    this.assert(await this.hasSelector("[data-turbo-preview]"))
  }

  async "test demonstrates preloaded snapshot from eager frame"() {
    await this.goToLocation("/src/tests/fixtures/frame_preloading.html")
    await this.clickSelector("#frame_preload_anchor")
    this.assert(await this.hasSelector("[data-turbo-preview]"))
  }
}

PreloadingTests.registerSuite()
