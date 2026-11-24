import { nextEventLoopTick } from "../../util"
import { expandURL } from "../url"
import { View, type ViewDelegate } from "../view"
import { ErrorRenderer } from "./error_renderer"
import { MorphingPageRenderer } from "./morphing_page_renderer"
import { PageRenderer } from "./page_renderer"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"
import type { Renderer } from "../renderer"
import type { Visit } from "./visit"

export interface PageViewDelegate extends ViewDelegate<HTMLBodyElement, PageSnapshot> {
  viewWillCacheSnapshot(): void
}

type PageViewRenderer = Renderer<HTMLBodyElement, PageSnapshot>

type CacheRequest = {
  snapshot: PageSnapshot
  location: URL
  capturedWhileConnected: boolean
  cachedSnapshotPromise?: Promise<PageSnapshot | undefined>
}

export class PageView extends View<HTMLBodyElement, PageSnapshot, PageViewRenderer, PageViewDelegate> {
  #lastSnapshotWrite: Promise<void> = Promise.resolve()
  #cacheRequestsByBody = new WeakMap<Element, CacheRequest>()
  #cacheRequestsByRenderer = new WeakMap<PageViewRenderer, CacheRequest | undefined>()
  #visitsByRenderer = new WeakMap<PageViewRenderer, Visit>()

  snapshotCache = new SnapshotCache(10)
  lastRenderedLocation = new URL(location.href)
  forceReloaded = false

  renderPage(
    snapshot: PageSnapshot,
    isPreview = false,
    willRender = true,
    visit?: Visit,
    reloadLocation?: URL
  ): Promise<void> {
    const shouldMorphPage = this.isPageRefresh(visit) && (visit?.refresh?.method || this.snapshot.refreshMethod) === "morph"
    const rendererClass = shouldMorphPage ? MorphingPageRenderer : PageRenderer

    const renderer = new rendererClass(this.snapshot, snapshot, isPreview, willRender, reloadLocation)
    if (visit) this.#visitsByRenderer.set(renderer, visit)

    if (!renderer.shouldRender) {
      this.forceReloaded = true
    } else {
      this.forceReloaded = false
      visit?.changeHistory()
    }

    return this.render(renderer)
  }

  renderError(snapshot: PageSnapshot, visit?: Visit): Promise<void> {
    visit?.changeHistory()
    const renderer = new ErrorRenderer(this.snapshot, snapshot, false)
    if (visit) this.#visitsByRenderer.set(renderer, visit)
    return this.render(renderer)
  }

  render(renderer: PageViewRenderer): Promise<void> {
    const initialRequest = this.#cacheRequestsByBody.get(renderer.currentElement)
    this.#cacheRequestsByRenderer.set(renderer, initialRequest)

    return super.render(renderer).finally(() => this.#releaseCacheRequest(renderer))
  }

  async renderSnapshot(renderer: PageViewRenderer): Promise<void> {
    let cacheRequest: CacheRequest | undefined
    if (renderer.willRender) {
      cacheRequest = this.#cacheRequestsByBody.get(renderer.currentElement)
      this.#cacheRequestsByRenderer.set(renderer, cacheRequest)
    }

    // Morphs and custom renders may mutate the body referenced by the outgoing snapshot.
    if (cacheRequest && renderer.renderElement !== PageRenderer.renderElement) {
      await cacheRequest.cachedSnapshotPromise
    }

    try {
      await super.renderSnapshot(renderer)
      this.#visitsByRenderer.get(renderer)?.recordDocument()
    } finally {
      if (cacheRequest) {
        await this.#repairSnapshotCache(cacheRequest)
      }
    }
  }

  clearSnapshotCache(): void {
    this.snapshotCache.clear()
    this.#cacheRequestsByBody = new WeakMap()
  }

  async cacheSnapshot(snapshot = this.snapshot, shouldNotifyApplication = true): Promise<PageSnapshot | undefined> {
    this.#cacheRequestsByBody.delete(snapshot.element)
    if (snapshot.isCacheable) {
      if (shouldNotifyApplication) this.delegate.viewWillCacheSnapshot()
      const location = expandURL(this.lastRenderedLocation)
      const cacheRequest: CacheRequest = { snapshot, location, capturedWhileConnected: false }
      const snapshotPromise = nextEventLoopTick().then(() => {
        cacheRequest.capturedWhileConnected = snapshot.isConnected
        return snapshot.clone()
      })
      const write = this.#cacheSnapshot(location, snapshotPromise)
      cacheRequest.cachedSnapshotPromise = write.catch(() => undefined)
      if (snapshot.element === this.element.ownerDocument.body) {
        this.#cacheRequestsByBody.set(snapshot.element, cacheRequest)
      }
      return write
    }
  }

  async cacheSnapshotAtLocation(snapshot: PageSnapshot, location: URL | string): Promise<PageSnapshot | undefined> {
    if (snapshot.isCacheable) {
      const cacheLocation = expandURL(location)
      const cachedSnapshot = snapshot.clone()
      return this.#cacheSnapshot(cacheLocation, Promise.resolve(cachedSnapshot))
    }
  }

  getCachedSnapshotForLocation(location: URL): PageSnapshot | undefined {
    return this.snapshotCache.get(location)?.clone()
  }

  shouldTransitionTo(newSnapshot: PageSnapshot): boolean {
    return this.snapshot.prefersViewTransitions && newSnapshot.prefersViewTransitions
  }

  isPageRefresh(visit?: Visit): boolean {
    const previousLocation = visit?.willRender === false && visit.referrer ?
      expandURL(visit.referrer) :
      this.lastRenderedLocation

    return !visit || (previousLocation.pathname === visit.location.pathname && visit.action === "replace")
  }

  shouldPreserveScrollPosition(visit?: Visit): boolean {
    if (visit?.scroll) {
      return visit.scroll === "preserve"
    } else {
      return this.isPageRefresh(visit) && (visit?.refresh?.scroll || this.snapshot.refreshScroll) === "preserve"
    }
  }

  get snapshot(): PageSnapshot {
    return PageSnapshot.fromElement(this.element)
  }

  // Private

  #releaseCacheRequest(renderer: PageViewRenderer): void {
    const cacheRequest = this.#cacheRequestsByRenderer.get(renderer)
    this.#cacheRequestsByRenderer.delete(renderer)
    if (this.#cacheRequestsByBody.get(renderer.currentElement) === cacheRequest) {
      this.#cacheRequestsByBody.delete(renderer.currentElement)
    }
  }

  async #repairSnapshotCache(cacheRequest: CacheRequest): Promise<void> {
    try {
      const { snapshot, capturedWhileConnected } = cacheRequest
      const isCurrentRequest = this.#cacheRequestsByBody.get(snapshot.element) === cacheRequest
      const wasCapturedBeforeRemoval = capturedWhileConnected && !snapshot.isConnected

      if (isCurrentRequest && wasCapturedBeforeRemoval) {
        const previousSnapshot = await cacheRequest.cachedSnapshotPromise
        if (previousSnapshot) {
          await this.#cacheSnapshotAfterRemoval(cacheRequest, previousSnapshot)
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  async #cacheSnapshotAfterRemoval(cacheRequest: CacheRequest, previousSnapshot: PageSnapshot): Promise<PageSnapshot | undefined> {
    await nextEventLoopTick()

    const { snapshot, location } = cacheRequest
    if (!snapshot.isConnected) {
      const cachedSnapshot = snapshot.clone()
      return this.#cacheSnapshot(location, Promise.resolve(cachedSnapshot), () => {
        return this.#cacheRequestsByBody.get(snapshot.element) === cacheRequest &&
          this.snapshotCache.get(location) === previousSnapshot
      })
    }
  }

  #cacheSnapshot(
    location: URL,
    snapshotPromise: Promise<PageSnapshot>,
    shouldCache: () => boolean = () => true
  ): Promise<PageSnapshot> {
    const snapshotResult = snapshotPromise.then(
      (snapshot): { snapshot: PageSnapshot } | { error: unknown } => ({ snapshot }),
      (error: unknown) => ({ error })
    )

    const write = this.#lastSnapshotWrite.then(async () => {
      const result = await snapshotResult
      if ("error" in result) throw result.error
      const { snapshot } = result
      if (shouldCache()) this.snapshotCache.put(location, snapshot)
      return snapshot
    })

    this.#lastSnapshotWrite = write.then(
      () => undefined,
      () => undefined
    )
    return write
  }
}
