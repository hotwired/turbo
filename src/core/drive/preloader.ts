import { Navigator } from "./navigator"
import { PageSnapshot } from "./page_snapshot"
import { SnapshotCache } from "./snapshot_cache"

export interface PreloaderDelegate {
  readonly navigator: Navigator
}

export class Preloader {
  readonly delegate: PreloaderDelegate
  readonly selector: string = 'a[data-turbo-preload="true"]'

  constructor(delegate: PreloaderDelegate) {
    this.delegate = delegate
  }

  get snapshotCache(): SnapshotCache {
    return this.delegate.navigator.view.snapshotCache
  }

  start() {
    if (document.readyState === 'loading') {
      return document.addEventListener('DOMContentLoaded', () => {
        this.preloadOnLoadLinksForView(document.body)
      });
    } else {
      this.preloadOnLoadLinksForView(document.body)
    }
  }

  preloadOnLoadLinksForView(element: Element) {
    for (const link of element.querySelectorAll<HTMLAnchorElement>(this.selector)) {
      this.preloadURL(link)
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
