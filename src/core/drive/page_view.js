import { nextEventLoopTick } from "../../util"
import { expandURL } from "../url"
import { View } from "../view"
import { ErrorRenderer } from "./error_renderer"
import { MorphingPageRenderer } from "./morphing_page_renderer"
import { PageRenderer } from "./page_renderer"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"

export class PageView extends View {
  #lastSnapshotWrite = Promise.resolve()
  #snapshotCacheRequests = new WeakMap()
  #renderCacheRequests = new WeakMap()

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

  render(renderer) {
    const cacheRequest = this.#snapshotCacheRequests.get(renderer.currentElement)
    this.#renderCacheRequests.set(renderer, cacheRequest)

    return super.render(renderer).finally(() => {
      const cacheRequest = this.#renderCacheRequests.get(renderer)
      this.#renderCacheRequests.delete(renderer)
      if (this.#snapshotCacheRequests.get(renderer.currentElement) === cacheRequest) {
        this.#snapshotCacheRequests.delete(renderer.currentElement)
      }
    })
  }

  async renderSnapshot(renderer) {
    if (renderer.willRender) {
      this.#renderCacheRequests.set(renderer, this.#snapshotCacheRequests.get(renderer.currentElement))
    }
    const cacheRequest = this.#renderCacheRequests.get(renderer)

    // Morphs and custom renders may mutate the body referenced by the outgoing snapshot.
    if (cacheRequest && renderer.willRender && renderer.renderElement !== PageRenderer.renderElement) {
      await cacheRequest.result
    }

    try {
      await super.renderSnapshot(renderer)
    } finally {
      if (cacheRequest && renderer.willRender) {
        await this.#repairSnapshotCache(cacheRequest).catch((error) => console.error(error))
      }
    }
  }

  clearSnapshotCache() {
    this.snapshotCache.clear()
    this.#snapshotCacheRequests = new WeakMap()
  }

  async cacheSnapshot(snapshot = this.snapshot, shouldNotifyApplication = true) {
    this.#snapshotCacheRequests.delete(snapshot.element)
    if (snapshot.isCacheable) {
      if (shouldNotifyApplication) this.delegate.viewWillCacheSnapshot()
      const location = expandURL(this.lastRenderedLocation)
      const request = { snapshot, location, cachedWhileConnected: false }
      const cachedSnapshot = nextEventLoopTick().then(() => {
        request.cachedWhileConnected = snapshot.isConnected
        return snapshot.clone()
      })
      const write = this.#cacheSnapshot(location, cachedSnapshot)
      request.result = write.catch(() => undefined)
      if (snapshot.element === this.element.ownerDocument.body) {
        this.#snapshotCacheRequests.set(snapshot.element, request)
      }
      return write
    }
  }

  async cacheSnapshotAtLocation(snapshot, location) {
    if (snapshot.isCacheable) {
      const cacheLocation = expandURL(location)
      const cachedSnapshot = snapshot.clone()
      return this.#cacheSnapshot(cacheLocation, Promise.resolve(cachedSnapshot))
    }
  }

  getCachedSnapshotForLocation(location) {
    return this.snapshotCache.get(location)?.clone()
  }

  isPageRefresh(visit) {
    const previousLocation = visit?.willRender === false && visit.referrer ?
      expandURL(visit.referrer) :
      this.lastRenderedLocation

    return !visit || (previousLocation.pathname === visit.location.pathname && visit.action === "replace")
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

  // Private

  async #repairSnapshotCache(request) {
    const { snapshot, location } = request
    if (this.#snapshotCacheRequests.get(snapshot.element) !== request) return
    if (!request.cachedWhileConnected || snapshot.isConnected) return

    const previousSnapshot = await request.result
    if (!previousSnapshot) return

    await nextEventLoopTick()
    if (snapshot.isConnected) return

    const cachedSnapshot = snapshot.clone()
    return this.#cacheSnapshot(location, Promise.resolve(cachedSnapshot), () => {
      return this.#snapshotCacheRequests.get(snapshot.element) === request &&
        this.snapshotCache.get(location) === previousSnapshot
    })
  }

  #cacheSnapshot(location, snapshotPromise, shouldCache = () => true) {
    const snapshotResult = snapshotPromise.then(
      (snapshot) => ({ snapshot }),
      (error) => ({ error })
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
