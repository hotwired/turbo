import { ErrorRenderer } from "./error_renderer"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"
import { PageRenderer, RenderCallback, RenderDelegate } from "./page_renderer"
import { Position } from "../types"
import { nextMicrotask } from "../../util"

export type RenderOptions = { snapshot: PageSnapshot, error: string, isPreview: boolean }

export type ViewDelegate = RenderDelegate & {
  viewWillCacheSnapshot(): void
}

export class View {
  readonly delegate: ViewDelegate
  readonly htmlElement = document.documentElement as HTMLHtmlElement
  readonly snapshotCache = new SnapshotCache(10)
  lastRenderedLocation?: URL

  constructor(delegate: ViewDelegate) {
    this.delegate = delegate
  }

  getRootLocation(): URL {
    return this.getSnapshot().rootLocation
  }

  getElementForAnchor(anchor: string) {
    return this.getSnapshot().getElementForAnchor(anchor)
  }

  getSnapshot(): PageSnapshot {
    return PageSnapshot.fromHTMLElement(this.htmlElement)
  }

  clearSnapshotCache() {
    this.snapshotCache.clear()
  }

  shouldCacheSnapshot() {
    return this.getSnapshot().isCacheable
  }

  async cacheSnapshot() {
    if (this.shouldCacheSnapshot()) {
      this.delegate.viewWillCacheSnapshot()
      const snapshot = this.getSnapshot()
      const location = this.lastRenderedLocation || new URL(window.location.href)
      await nextMicrotask()
      this.snapshotCache.put(location, snapshot.clone())
    }
  }

  getCachedSnapshotForLocation(location: URL) {
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

  renderSnapshot(snapshot: PageSnapshot, isPreview: boolean | undefined, callback: RenderCallback) {
    PageRenderer.render(this.delegate, callback, this.getSnapshot(), snapshot, isPreview || false)
  }

  renderError(error: string | undefined, callback: RenderCallback) {
    ErrorRenderer.render(this.delegate, callback, error || "")
  }
}
