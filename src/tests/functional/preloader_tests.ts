import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

const preloadedUrl = "http://localhost:9000/src/tests/fixtures/preloaded.html"

export class PreloaderTests extends TurboDriveTestCase {
  async "test preloads snapshot on initial load"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.goToLocation("/src/tests/fixtures/preloading.html")

    this.assert.ok(await this.remote.execute(() =>
       preloadedUrl in window.Turbo.session.preloader.snapshotCache.snapshots
    ))
  }

  async "test preloads snapshot on page visit"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloading.html"]`
    await this.goToLocation("/src/tests/fixtures/hot_preloading.html")

    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.clickSelector("#hot_preload_anchor")
    await this.waitUntilSelector("#preload_anchor")

    this.assert.ok(await this.remote.execute(() =>
       preloadedUrl in window.Turbo.session.preloader.snapshotCache.snapshots
    ))
  }

  async "test navigates to preloaded snapshot from frame"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.goToLocation("/src/tests/fixtures/frame_preloading.html")
    await this.waitUntilSelector("#frame_preload_anchor")
    await this.nextBeat

    this.assert.ok(await this.remote.execute(() =>
       preloadedUrl in window.Turbo.session.preloader.snapshotCache.snapshots
    ))
  }
}

PreloaderTests.registerSuite()
