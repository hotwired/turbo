import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class PreloaderTests extends TurboDriveTestCase {
  async "test preloads snapshot on initial load"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.goToLocation("/src/tests/fixtures/preloading.html")
    await this.nextBeat

    this.assert.ok(
      await this.remote.execute(() => {
        const preloadedUrl = "http://localhost:9000/src/tests/fixtures/preloaded.html"
        const cache = window.Turbo.session.preloader.snapshotCache.snapshots

        return preloadedUrl in cache
      })
    )
  }

  async "test preloads snapshot on page visit"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloading.html"]`
    await this.goToLocation("/src/tests/fixtures/hot_preloading.html")

    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.clickSelector("#hot_preload_anchor")
    await this.waitUntilSelector("#preload_anchor")
    await this.nextBeat

    this.assert.ok(
      await this.remote.execute(() => {
        const preloadedUrl = "http://localhost:9000/src/tests/fixtures/preloaded.html"
        const cache = window.Turbo.session.preloader.snapshotCache.snapshots

        return preloadedUrl in cache
      })
    )
  }

  async "test navigates to preloaded snapshot from frame"() {
    // contains `a[rel="preload"][href="http://localhost:9000/src/tests/fixtures/preloaded.html"]`
    await this.goToLocation("/src/tests/fixtures/frame_preloading.html")
    await this.waitUntilSelector("#frame_preload_anchor")
    await this.nextBeat

    this.assert.ok(
      await this.remote.execute(() => {
        const preloadedUrl = "http://localhost:9000/src/tests/fixtures/preloaded.html"
        const cache = window.Turbo.session.preloader.snapshotCache.snapshots

        return preloadedUrl in cache
      })
    )
  }
}

PreloaderTests.registerSuite()
