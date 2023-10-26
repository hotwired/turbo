import { PageSnapshot } from "./page_snapshot"
import { fetch } from "../../http/fetch"

export class Preloader {
  selector = "a[data-turbo-preload]"

  constructor(delegate) {
    this.delegate = delegate
  }

  get snapshotCache() {
    return this.delegate.navigator.view.snapshotCache
  }

  start() {
    if (document.readyState === "loading") {
      return document.addEventListener("DOMContentLoaded", () => {
        this.preloadOnLoadLinksForView(document.body)
      })
    } else {
      this.preloadOnLoadLinksForView(document.body)
    }
  }

  preloadOnLoadLinksForView(element) {
    for (const link of element.querySelectorAll(this.selector)) {
      this.preloadURL(link)
    }
  }

  async preloadURL(link) {
    const location = new URL(link.href)

    if (await this.snapshotCache.has(location)) return

    try {
      const response = await fetch(location.toString(), { headers: { "Sec-Purpose": "prefetch", Accept: "text/html" } })
      const responseText = await response.text()
      const snapshot = PageSnapshot.fromHTMLString(responseText)

      this.snapshotCache.put(location, snapshot)
    } catch (_) {
      // If we cannot preload that is ok!
    }
  }
}
