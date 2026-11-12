import { nextEventLoopTick } from "../../util"
import { expandURL } from "../url"
import { View } from "../view"
import { ErrorRenderer } from "./error_renderer"
import { MorphingPageRenderer } from "./morphing_page_renderer"
import { PageRenderer } from "./page_renderer"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"

export class PageView extends View {
  #cacheSnapshotWrites = Promise.resolve()

  snapshotCache = new SnapshotCache(10)
  lastRenderedLocation = new URL(location.href)
  forceReloaded = false

  shouldTransitionTo(newSnapshot) {
    return this.snapshot.prefersViewTransitions && newSnapshot.prefersViewTransitions
  }

  renderPage(snapshot, isPreview = false, willRender = true, visit) {
    const shouldMorphPage = this.isPageRefresh(visit) && (visit?.refresh?.method || this.snapshot.refreshMethod) === "morph"
    const rendererClass = shouldMorphPage ? MorphingPageRenderer : PageRenderer

    const renderer = new rendererClass(this.snapshot, snapshot, isPreview, willRender)

    if (!renderer.shouldRender) {
      this.forceReloaded = true
    } else {
      this.forceReloaded = false
      visit?.changeHistory()
    }

    return this.render(renderer)
  }

  renderError(snapshot, visit) {
    visit?.changeHistory()
    const renderer = new ErrorRenderer(this.snapshot, snapshot, false)
    return this.render(renderer)
  }

  clearSnapshotCache() {
    this.snapshotCache.clear()
  }

  async cacheSnapshot(snapshot = this.snapshot, shouldNotifyApplication = true) {
    if (snapshot.isCacheable) {
      if (shouldNotifyApplication) this.delegate.viewWillCacheSnapshot()
      const location = expandURL(this.lastRenderedLocation)
      const cachedSnapshot = nextEventLoopTick().then(() => snapshot.clone())
      return this.#cacheSnapshot(location, cachedSnapshot)
    }
  }

  async cacheSnapshotAtLocation(snapshot, location, prepareSnapshot) {
    if (snapshot.isCacheable) {
      const cacheLocation = expandURL(location)
      const cachedSnapshot = snapshot.clone()
      return this.#cacheSnapshot(cacheLocation, Promise.resolve(cachedSnapshot), prepareSnapshot)
    }
  }

  getCachedSnapshotForLocation(location) {
    return this.snapshotCache.get(location)?.clone()
  }

  isPageRefresh(visit) {
    return !visit || (this.lastRenderedLocation.pathname === visit.location.pathname && visit.action === "replace")
  }

  shouldPreserveScrollPosition(visit) {
    if (visit?.scroll) {
      return visit.scroll === "preserve"
    } else {
      return this.isPageRefresh(visit) && (visit?.refresh?.scroll || this.snapshot.refreshScroll) === "preserve"
    }
  }

  get snapshot() {
    return PageSnapshot.fromElement(this.element)
  }

  #cacheSnapshot(location, snapshotPromise, prepareSnapshot) {
    const snapshotResult = snapshotPromise.then(
      (snapshot) => ({ snapshot }),
      (error) => ({ error })
    )

    const write = this.#cacheSnapshotWrites.then(async () => {
      const result = await snapshotResult
      if ("error" in result) throw result.error
      const { snapshot } = result
      prepareSnapshot?.(snapshot)
      this.snapshotCache.put(location, snapshot)
      return snapshot
    })

    this.#cacheSnapshotWrites = write.then(
      () => undefined,
      () => undefined
    )
    return write
  }
}
