import { PageSnapshot } from "./page_snapshot"
import { fetch } from "../../http/fetch"

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

    try {
      const response = await fetch(location.toString(), { headers: { "x-purpose": "preview", Accept: "text/html" } })
      const responseText = await response.text()
      const snapshot = PageSnapshot.fromHTMLString(responseText)

      this.snapshotCache.put(location, snapshot)
    } catch (_) {
      // If we cannot preload that is ok!
    }
  }

  #preloadAll = () => {
    this.preloadOnLoadLinksForView(document.body)
  }
}
