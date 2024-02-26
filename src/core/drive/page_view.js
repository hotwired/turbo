import { nextEventLoopTick } from "../../util"
import { View } from "../view"
import { ErrorRenderer } from "./error_renderer"
import { MorphRenderer } from "./morph_renderer"
import { PageRenderer } from "./page_renderer"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"

export class PageView extends View {
  snapshotCache = new SnapshotCache(10)
  lastRenderedLocation = new URL(location.href)
  forceReloaded = false

  shouldTransitionTo(newSnapshot) {
    return this.snapshot.prefersViewTransitions && newSnapshot.prefersViewTransitions
  }

  renderPage(snapshot, isPreview = false, willRender = true, visit) {
    const shouldMorphPage = snapshot.shouldMorphPage && this.isMorphableVisit(visit)
    const rendererClass = shouldMorphPage ? MorphRenderer : PageRenderer

    const renderer = new rendererClass(this.snapshot, snapshot, PageRenderer.renderElement, isPreview, willRender)

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

  isMorphableVisit(visit) {
    return this.isPageRefresh(visit) || this.isReplaceMethodMorph(visit)
  }

  isPageRefresh(visit) {
    return !visit || (this.lastRenderedLocation.href === visit.location.href && visit.action === "replace")
  }

  isReplaceMethodMorph(visit) {
    return visit.action === "replace" && visit.replaceMethod === "morph"
  }

  shouldPreserveScrollPosition(visit) {
    return this.isPageRefresh(visit) && this.snapshot.shouldPreserveScrollPosition
  }

  get snapshot() {
    return PageSnapshot.fromElement(this.element)
  }
}
