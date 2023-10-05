import { PageSnapshot } from "./page_snapshot"

export class Preloader {
  selector = "a[data-turbo-preload]"

  constructor(delegate) {
    this.delegate = delegate
    this.preloadLinkObserver = new MutationObserver((mutationList, observer) => {
      mutationList.forEach((mutation) => {
        if (mutation.attributeName !== "data-turbo-preload" || mutation.target.tagName !== "A") return

        this.preloadURL(mutation.target)
      })
    })
  }

  get snapshotCache() {
    return this.delegate.navigator.view.snapshotCache
  }

  start() {
    if (document.readyState === "loading") {
      return document.addEventListener("DOMContentLoaded", () => {
        this.preloadOnLoadLinksForView(document.body)
        this.observeLinksForView(document.body)
      })
    } else {
      this.preloadOnLoadLinksForView(document.body)
      this.observeLinksForView(document.body)
    }
  }

  preloadOnLoadLinksForView(element) {
    for (const link of element.querySelectorAll(this.selector)) {
      this.preloadURL(link)
    }
  }

  observeLinksForView(element) {
    this.preloadLinkObserver.observe(element, {
      attributes: true,
      subtree: true
    })
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
