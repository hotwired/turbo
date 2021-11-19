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

  async "test cache does not override preloaded response"() {
    this.assert(await this.hasSelector("#flash"))
    this.clickSelector("#link")
    await this.nextBody
    this.clickSelector("#redirection-link-to-cache")
    await this.nextBody
    if(!(await this.hasSelector("#flash")))
      await this.nextBody
    this.assert.ok(await this.hasSelector("#flash"))
  }
}

CacheObserverTests.registerSuite()
