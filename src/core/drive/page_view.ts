import { nextEventLoopTick } from "../../util"
import { View, ViewDelegate } from "../view"
import { ErrorRenderer } from "./error_renderer"
import { PageRenderer } from "./page_renderer"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"

export interface PageViewDelegate extends ViewDelegate<PageSnapshot> {
  viewWillCacheSnapshot(): void
}

type PageViewRenderer = PageRenderer | ErrorRenderer

export class PageView extends View<Element, PageSnapshot, PageViewRenderer, PageViewDelegate> {
  readonly snapshotCache = new SnapshotCache(10)
  lastRenderedLocation = new URL(location.href)
  forceReloaded = false

  renderPage(snapshot: PageSnapshot, isPreview = false, willRender = true) {
    const renderer = new PageRenderer(this.snapshot, snapshot, isPreview, willRender)
    if (!renderer.shouldRender) {
      this.forceReloaded = true
    }
    return this.render(renderer)
  }

  renderError(snapshot: PageSnapshot) {
    const renderer = new ErrorRenderer(this.snapshot, snapshot, false)
    return this.render(renderer)
  }

  clearSnapshotCache() {
    this.snapshotCache.clear()
  }

  async cacheSnapshot() {
    if (this.shouldCacheSnapshot) {
      this.delegate.viewWillCacheSnapshot()
      const { snapshot, lastRenderedLocation: location } = this
      await nextEventLoopTick()
      const cachedSnapshot = snapshot.clone()
      this.snapshotCache.put(location, cachedSnapshot)
      return cachedSnapshot
    }
  }

  getCachedSnapshotForLocation(location: URL) {
    return this.snapshotCache.get(location)
  }

  get snapshot() {
    return PageSnapshot.fromElement(this.element)
  }

  get shouldCacheSnapshot() {
    return this.snapshot.isCacheable
  }
}
