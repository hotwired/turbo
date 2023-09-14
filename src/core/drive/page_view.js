import { nextEventLoopTick } from "../../util"
import { View } from "../view"
import { ErrorRenderer } from "./error_renderer"
import { PageRenderer } from "./page_renderer"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"

export class PageView extends View {
  snapshotCache = new SnapshotCache()
  lastRenderedLocation = new URL(location.href)
  forceReloaded = false

  shouldTransitionTo(newSnapshot) {
    return this.snapshot.prefersViewTransitions && newSnapshot.prefersViewTransitions
  }

  renderPage(snapshot, isPreview = false, willRender = true, visit) {
    const renderer = new PageRenderer(this.snapshot, snapshot, PageRenderer.renderElement, isPreview, willRender)

    if (!renderer.shouldRender) {
      this.forceReloaded = true
    } else {
      visit?.changeHistory()
    }

    return this.render(renderer)
  }

  renderError(snapshot, visit) {
    visit?.changeHistory()
    const renderer = new ErrorRenderer(this.snapshot, snapshot, ErrorRenderer.renderElement, false)
    return this.render(renderer)
  }

  setCacheStore(cacheName) {
    SnapshotCache.setStore(cacheName)
  }

  clearSnapshotCache() {
    this.snapshotCache.clear()
  }

  async cacheSnapshot(snapshot = this.snapshot) {
    if (snapshot.isCacheable) {
      this.delegate.viewWillCacheSnapshot()
      const { lastRenderedLocation: location } = this
      await nextEventLoopTick()
      const cachedSnapshot = snapshot.clone()
      this.snapshotCache.put(location, cachedSnapshot)
      return cachedSnapshot
    }
  }

  getCachedSnapshotForLocation(location) {
    return this.snapshotCache.get(location)
  }

  get snapshot() {
    return PageSnapshot.fromElement(this.element)
  }
}
