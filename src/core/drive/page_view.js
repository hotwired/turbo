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
    const rendererClass = this.shouldMorphPage(visit) ? MorphRenderer : PageRenderer

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

  isPageRefresh(visit) {
    return !visit || (this.lastRenderedLocation.pathname === visit.location.pathname && visit.action === "replace")
  }

  shouldPreserveScrollPosition(visit) {
    return this.isPageRefresh(visit) && this.snapshot.shouldPreserveScrollPosition
  }

  shouldMorphPage(visit) {
    return (this.isPageRefresh(visit) || this.isMorphableURL(visit)) && this.snapshot.shouldMorphPage
  }

  isMorphableURL(visit) {
    return (
      this.snapshot.morphURLPrefix != "" &&
      this.lastRenderedLocation.pathname.startsWith(this.snapshot.morphURLPrefix) &&
      visit.action === "advance"
    )
  }

  get snapshot() {
    return PageSnapshot.fromElement(this.element)
  }
}
