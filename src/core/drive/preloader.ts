import { PageSnapshot } from "./page_snapshot"
import { FetchMethod, FetchRequest, type FetchRequestDelegate } from "../../http/fetch_request"
import type { FetchResponse } from "../../http/fetch_response"
import type { SnapshotCache } from "./snapshot_cache"

export interface PreloaderDelegate {
  shouldPreloadLink(link: HTMLAnchorElement): boolean
}

export class Preloader implements FetchRequestDelegate {
  readonly selector = "a[data-turbo-preload]"
  #requestGenerations = new WeakMap<FetchRequest, number>()
  declare readonly delegate: PreloaderDelegate
  declare readonly snapshotCache: SnapshotCache

  constructor(delegate: PreloaderDelegate, snapshotCache: SnapshotCache) {
    this.delegate = delegate
    this.snapshotCache = snapshotCache
  }

  start(): void {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.#preloadAll)
    } else {
      this.preloadOnLoadLinksForView(document.body)
    }
  }

  stop(): void {
    document.removeEventListener("DOMContentLoaded", this.#preloadAll)
  }

  preloadOnLoadLinksForView(element: Element): void {
    for (const link of element.querySelectorAll<HTMLAnchorElement>(this.selector)) {
      if (this.delegate.shouldPreloadLink(link)) {
        this.preloadURL(link)
      }
    }
  }

  async preloadURL(link: HTMLAnchorElement): Promise<void> {
    const location = new URL(link.href)

    if (this.snapshotCache.has(location)) {
      return
    }

    const fetchRequest = new FetchRequest(this, FetchMethod.get, location, new URLSearchParams(), link)
    await fetchRequest.perform()
  }

  // Fetch request delegate

  prepareRequest(fetchRequest: FetchRequest): void {
    fetchRequest.headers["X-Sec-Purpose"] = "prefetch"
  }

  async requestSucceededWithResponse(fetchRequest: FetchRequest, fetchResponse: FetchResponse): Promise<void> {
    try {
      const generation = this.#requestGenerations.get(fetchRequest)
      const responseHTML = await fetchResponse.responseHTML
      if (generation !== this.snapshotCache.generation || this.snapshotCache.has(fetchRequest.url)) return

      const snapshot = PageSnapshot.fromHTMLString(responseHTML)

      this.snapshotCache.put(fetchRequest.url, snapshot)
    } catch (_) {
      // If we cannot preload that is ok!
    }
  }

  requestStarted(fetchRequest: FetchRequest): void {
    this.#requestGenerations.set(fetchRequest, this.snapshotCache.generation)
  }

  requestErrored(_fetchRequest: FetchRequest): void {}

  requestFinished(_fetchRequest: FetchRequest): void {}

  requestPreventedHandlingResponse(_fetchRequest: FetchRequest, _fetchResponse: FetchResponse): void {}

  requestFailedWithResponse(_fetchRequest: FetchRequest, _fetchResponse: FetchResponse): void {}

  #preloadAll = () => {
    this.preloadOnLoadLinksForView(document.body)
  }
}
