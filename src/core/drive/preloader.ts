import { expandURL } from "../url"
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
      this.preloadURL(link)
    }
  }

  preloadURL(link: Element) {
    const url = expandURL(link.getAttribute("href") || "")

    if (this.snapshotCache.has(url)) {
      return
    }

    fetch(url.toString(), { headers: { 'VND.PREFETCH': 'true', 'Accept': 'text/html' } })
      .then(res => res.text())
      .then(responseText => PageSnapshot.fromHTMLString(responseText))
      .then(snapshot => this.snapshotCache.put(url, snapshot))
      .catch(() => {})
  }
}
