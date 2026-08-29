import { PageSnapshot } from "./page_snapshot"
import { FetchMethod, FetchRequest } from "../../http/fetch_request"
import { AttributeObserver } from "../../observers/attribute_observer"

export class Preloader {
  constructor(delegate, snapshotCache) {
    this.delegate = delegate
    this.snapshotCache = snapshotCache
    this.attributeObserver = new AttributeObserver(this, document.documentElement, "data-turbo-preload")
  }

  start() {
    this.attributeObserver.start()
  }

  stop() {
    this.attributeObserver.stop()
  }

  observedElementWithAttribute(element) {
    if (element instanceof HTMLAnchorElement && this.delegate.shouldPreloadLink(element)) {
      this.preloadURL(element)
    }
  }

  async preloadURL(link) {
    const location = new URL(link.href)

    if (this.snapshotCache.has(location)) {
      return
    }

    const fetchRequest = new FetchRequest(this, FetchMethod.get, location, new URLSearchParams(), link)
    await fetchRequest.perform()
  }

  // Fetch request delegate

  prepareRequest(fetchRequest) {
    fetchRequest.headers["X-Sec-Purpose"] = "prefetch"
  }

  async requestSucceededWithResponse(fetchRequest, fetchResponse) {
    try {
      const responseHTML = await fetchResponse.responseHTML
      const snapshot = PageSnapshot.fromHTMLString(responseHTML)

      this.snapshotCache.put(fetchRequest.url, snapshot)
    } catch (_) {
      // If we cannot preload that is ok!
    }
  }

  requestStarted(fetchRequest) {}

  requestErrored(fetchRequest) {}

  requestFinished(fetchRequest) {}

  requestPreventedHandlingResponse(fetchRequest, fetchResponse) {}

  requestFailedWithResponse(fetchRequest, fetchResponse) {}
}
