import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class PreloaderTests extends TurboDriveTestCase {
  async "test navigates to preloaded snapshot from cold start"() {
    await this.goToLocation("/src/tests/fixtures/preloading.html")
    await this.clickSelector("#preload_anchor")
    console.log(await this.hasSelector("html[data-turbo-preview]")))
  }

  async "test navigates to preloaded snapshot from hot navigation"() {
    await this.goToLocation("/src/tests/fixtures/hot_preloading.html")
    await this.clickSelector("#hot_preload_anchor")
    await this.clickSelector("#preload_anchor")
    this.assert.ok(await this.attributeForSelector("#html", "data-turbo-preview"))
  }

  async "test navigates to preloaded snapshot from eager frame"() {
    await this.goToLocation("/src/tests/fixtures/frame_preloading.html")
    await this.clickSelector("#frame_preload_anchor")
    this.assert.ok(await this.attributeForSelector("#html", "data-turbo-preview"))
  }
}

PreloaderTests.registerSuite()
