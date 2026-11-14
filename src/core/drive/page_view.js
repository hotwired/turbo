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
  #cacheRequestsByBody = new WeakMap()
  #cacheRequestsByRenderer = new WeakMap()

  snapshotCache = new SnapshotCache(10)
  lastRenderedLocation = new URL(location.href)
  forceReloaded = false

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
    const initialRequest = this.#cacheRequestsByBody.get(renderer.currentElement)
    this.#cacheRequestsByRenderer.set(renderer, initialRequest)

    return super.render(renderer).finally(() => this.#releaseCacheRequest(renderer))
  }

  async renderSnapshot(renderer) {
    let cacheRequest
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
    } finally {
      if (cacheRequest) {
        await this.#repairSnapshotCache(cacheRequest)
      }
    }
  }

  clearSnapshotCache() {
    this.snapshotCache.clear()
    this.#cacheRequestsByBody = new WeakMap()
  }

  async cacheSnapshot(snapshot = this.snapshot, shouldNotifyApplication = true) {
    this.#cacheRequestsByBody.delete(snapshot.element)
    if (snapshot.isCacheable) {
      if (shouldNotifyApplication) this.delegate.viewWillCacheSnapshot()
      const location = expandURL(this.lastRenderedLocation)
      const cacheRequest = { snapshot, location, capturedWhileConnected: false }
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

  shouldTransitionTo(newSnapshot) {
    return this.snapshot.prefersViewTransitions && newSnapshot.prefersViewTransitions
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

  #releaseCacheRequest(renderer) {
    const cacheRequest = this.#cacheRequestsByRenderer.get(renderer)
    this.#cacheRequestsByRenderer.delete(renderer)
    if (this.#cacheRequestsByBody.get(renderer.currentElement) === cacheRequest) {
      this.#cacheRequestsByBody.delete(renderer.currentElement)
    }
  }

  async #repairSnapshotCache(cacheRequest) {
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

  async #cacheSnapshotAfterRemoval(cacheRequest, previousSnapshot) {
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
