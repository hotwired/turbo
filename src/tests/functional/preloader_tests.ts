import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class PreloaderTests extends TurboDriveTestCase {
  async "test preloads snapshot on initial load"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.goToLocation("/src/tests/fixtures/preloading.html")

    this.assert.ok(await this.remote.execute(() =>
      "http://localhost:9000/src/tests/fixtures/preloaded.html" in window.Turbo.session.preloader.snapshotCache.snapshots
    ))
  }

  async "test preloads snapshot on page visit"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloading.html"]`
    await this.goToLocation("/src/tests/fixtures/hot_preloading.html")

    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.clickSelector("#hot_preload_anchor")

    this.assert.ok(await this.remote.execute(() =>
      "http://localhost:9000/src/tests/fixtures/preloaded.html" in window.Turbo.session.preloader.snapshotCache.snapshots
    ))
  }

  async "test navigates to preloaded snapshot from eager frame"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.goToLocation("/src/tests/fixtures/preloading.html")

    this.assert.ok(await this.remote.execute(() =>
      "http://localhost:9000/src/tests/fixtures/preloaded.html" in window.Turbo.session.preloader.snapshotCache.snapshots
    ))
  }
}

PreloaderTests.registerSuite()
