import { Navigator } from "./navigator"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"

export interface PreloaderDelegate {
  readonly navigator: Navigator
}

export class Preloader {
  readonly delegate: PreloaderDelegate
  readonly element: Element

  constructor(delegate: PreloaderDelegate, element: Element) {
    this.delegate = delegate
    this.element = element
  }

  get snapshotCache(): SnapshotCache {
    return this.delegate.navigator.view.snapshotCache
  }

  start() {
    this.preloadOnLoadLinksForView(this.element)
  }

  preloadOnLoadLinksForView(element: Element) {
    const links = element.querySelectorAll('a[data-turbo-preload="load"]')

    for (const link of links) {
      if (link instanceof HTMLAnchorElement) {
        this.preloadURL(link)
      }
    }
  }

  async preloadURL(link: HTMLAnchorElement) {
    const location = new URL(link.href)

    if (this.snapshotCache.has(location)) {
      return
    }

    try {
      const response = await fetch(location.toString(), { headers: { 'VND.PREFETCH': 'true', 'Accept': 'text/html' } })
      const responseText = await response.text()
      const snapshot = PageSnapshot.fromHTMLString(responseText)

      this.snapshotCache.put(location, snapshot)
    } catch(_) {
      // If we cannot preload that is ok!
    }
  }
}
