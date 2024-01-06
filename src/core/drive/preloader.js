import { PageSnapshot } from "./page_snapshot"
import { FetchMethod, FetchRequest } from "../../http/fetch_request"

export class Preloader {
  selector = "a[data-turbo-preload]"

  constructor(delegate, snapshotCache) {
    this.delegate = delegate
    this.snapshotCache = snapshotCache
  }

  start() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.#preloadAll)
    } else {
      this.preloadOnLoadLinksForView(document.body)
    }
  }

  stop() {
    document.removeEventListener("DOMContentLoaded", this.#preloadAll)
  }

  preloadOnLoadLinksForView(element) {
    for (const link of element.querySelectorAll(this.selector)) {
      if (this.delegate.shouldPreloadLink(link)) {
        this.preloadURL(link)
      }
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
    fetchRequest.headers["Sec-Purpose"] = "prefetch"
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

  #preloadAll = () => {
    this.preloadOnLoadLinksForView(document.body)
  }
}
