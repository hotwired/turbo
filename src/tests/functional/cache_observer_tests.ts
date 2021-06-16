import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class CacheObserverTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/cache_observer.html")
  }

  async "test removes stale elements"() {
    this.assert(await this.hasSelector("#flash"))
    this.clickSelector("#link")
    await this.nextBody
    await this.goBack()
    await this.nextBody
    this.assert.notOk(await this.hasSelector("#flash"))
  }
}

CacheObserverTests.registerSuite()
