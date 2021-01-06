import { ErrorRenderer } from "./error_renderer"
import { Location } from "../location"
import { Snapshot } from "./snapshot"
import { SnapshotCache } from "./snapshot_cache"
import { RenderCallback, RenderDelegate, SnapshotRenderer } from "./snapshot_renderer"
import { Position } from "../types"

export type RenderOptions = { snapshot: Snapshot, error: string, isPreview: boolean }

export type ViewDelegate = RenderDelegate & {
  viewWillCacheSnapshot(): void
}

export class View {
  readonly delegate: ViewDelegate
  readonly htmlElement = document.documentElement as HTMLHtmlElement
  readonly snapshotCache = new SnapshotCache(10)
  lastRenderedLocation?: Location

  constructor(delegate: ViewDelegate) {
    this.delegate = delegate
  }

  getRootLocation(): Location {
    return this.getSnapshot().getRootLocation()
  }

  getElementForAnchor(anchor: string) {
    return this.getSnapshot().getElementForAnchor(anchor)
  }

  getSnapshot(): Snapshot {
    return Snapshot.fromHTMLElement(this.htmlElement)
  }

  clearSnapshotCache() {
    this.snapshotCache.clear()
  }

  shouldCacheSnapshot() {
    return this.getSnapshot().isCacheable()
  }

  cacheSnapshot() {
    if (this.shouldCacheSnapshot()) {
      this.delegate.viewWillCacheSnapshot()
      const snapshot = this.getSnapshot()
      const location = this.lastRenderedLocation || Location.currentLocation
      this.snapshotCache.put(location, snapshot.clone())
    }
  }

  getCachedSnapshotForLocation(location: Location) {
    return this.snapshotCache.get(location)
  }

  render({ snapshot, error, isPreview }: Partial<RenderOptions>, callback: RenderCallback) {
    this.markAsPreview(isPreview)
    if (snapshot) {
      this.renderSnapshot(snapshot, isPreview, callback)
    } else {
      this.renderError(error, callback)
    }
  }

  // Scrolling

  scrollToAnchor(anchor: string) {
    const element = this.getElementForAnchor(anchor)
    if (element) {
      this.scrollToElement(element)
    } else {
      this.scrollToPosition({ x: 0, y: 0 })
    }
  }

  scrollToElement(element: Element) {
    element.scrollIntoView()
  }

  scrollToPosition({ x, y }: Position) {
    window.scrollTo(x, y)
  }

  // Private

  markAsPreview(isPreview: boolean | undefined) {
    if (isPreview) {
      this.htmlElement.setAttribute("data-turbo-preview", "")
    } else {
      this.htmlElement.removeAttribute("data-turbo-preview")
    }
  }

  renderSnapshot(snapshot: Snapshot, isPreview: boolean | undefined, callback: RenderCallback) {
    SnapshotRenderer.render(this.delegate, callback, this.getSnapshot(), snapshot, isPreview || false)
  }

  renderError(error: string | undefined, callback: RenderCallback) {
    ErrorRenderer.render(this.delegate, callback, error || "")
  }
}
