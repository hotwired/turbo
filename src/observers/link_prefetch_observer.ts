import { expandURL, getLocationForLink, toCacheKey } from "../core/url"
import {
  dispatch,
  getMetaContent,
  findClosestRecursively,
  getLinkHrefString
} from "../util"

import { FetchMethod, FetchRequest, type FetchRequestDelegate } from "../http/fetch_request"
import type { TurboBeforeFetchRequestEvent, TurboVisitEvent } from "../core/events"
import { prefetchCache, cacheTtl } from "../core/drive/prefetch_cache"

export interface LinkPrefetchObserverDelegate {
  canPrefetchRequestToLocation(link: HTMLAnchorElement, location: URL): boolean
}

type PrefetchRequestDetail = TurboBeforeFetchRequestEvent["detail"]

export class LinkPrefetchObserver implements FetchRequestDelegate {
  started = false
  #prefetchedLink: HTMLAnchorElement | null = null
  #pendingFetchRequests = new Map<FetchRequest, URL>()
  declare readonly delegate: LinkPrefetchObserverDelegate
  declare readonly eventTarget: Document

  constructor(delegate: LinkPrefetchObserverDelegate, eventTarget: Document) {
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start(): void {
    if (this.started) return

    if (this.eventTarget.readyState === "loading") {
      this.eventTarget.addEventListener("DOMContentLoaded", this.#enable, { once: true })
    } else {
      this.#enable()
    }
  }

  stop(): void {
    if (!this.started) return

    this.eventTarget.removeEventListener("mouseenter", this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    } as EventListenerOptions)
    this.eventTarget.removeEventListener("mouseleave", this.#cancelRequestIfObsolete, {
      capture: true,
      passive: true
    } as EventListenerOptions)

    this.eventTarget.removeEventListener("turbo:before-fetch-request", this.#tryToUsePrefetchedRequest, true)
    this.eventTarget.removeEventListener("turbo:visit", this.#cancelPendingFetchRequests, true)
    this.#cancelPrefetchRequest()
    for (const fetchRequest of this.#pendingFetchRequests.keys()) {
      fetchRequest.cancel()
    }
    this.#pendingFetchRequests.clear()
    this.started = false
  }

  #enable = () => {
    this.eventTarget.addEventListener("mouseenter", this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    })
    this.eventTarget.addEventListener("mouseleave", this.#cancelRequestIfObsolete, {
      capture: true,
      passive: true
    })

    this.eventTarget.addEventListener("turbo:before-fetch-request", this.#tryToUsePrefetchedRequest, true)
    this.eventTarget.addEventListener("turbo:visit", this.#cancelPendingFetchRequests, true)
    this.started = true
  }

  #tryToPrefetchRequest = (event: Event) => {
    if (getMetaContent("turbo-prefetch") === "false") return

    const target = event.target as HTMLAnchorElement
    const isLink = target.matches && target.matches("a[href]:not([download])")

    if (isLink && this.#isPrefetchable(target)) {
      const link = target
      const location = getLocationForLink(link)

      if (this.delegate.canPrefetchRequestToLocation(link, location)) {
        this.#prefetchedLink = link

        const fetchRequest = new FetchRequest(
          this,
          FetchMethod.get,
          location,
          new URLSearchParams(),
          target
        )

        fetchRequest.fetchOptions.priority = "low"

        prefetchCache.putLater(fetchRequest.url, fetchRequest, this.#cacheTtl)
      }
    }
  }

  #cancelPendingFetchRequests = (event: TurboVisitEvent) => {
    const key = toCacheKey(expandURL(event.detail.url))

    for (const [fetchRequest, location] of this.#pendingFetchRequests) {
      if (toCacheKey(location) !== key) {
        fetchRequest.cancel()
        this.#pendingFetchRequests.delete(fetchRequest)
      }
    }
  }

  #cancelRequestIfObsolete = (event: Event) => {
    if (event.target === this.#prefetchedLink) this.#cancelPrefetchRequest()
  }

  #cancelPrefetchRequest = () => {
    prefetchCache.clear()
    this.#prefetchedLink = null
  }

  #tryToUsePrefetchedRequest = (event: TurboBeforeFetchRequestEvent) => {
    if ((event.target as Element).tagName !== "FORM" && event.detail.fetchOptions.method === "GET") {
      this.#usePrefetchedRequest(event.detail)
      prefetchCache.clear()
    }
  }

  // Fetch request delegate

  prepareRequest(request: FetchRequest): void {
    this.#trackPendingFetchRequest(request)

    const link = request.target as HTMLAnchorElement

    request.headers["X-Sec-Purpose"] = "prefetch"

    const turboFrame = link.closest("turbo-frame")
    let turboFrameTarget = link.getAttribute("data-turbo-frame") || turboFrame?.getAttribute("target") || turboFrame?.id

    if (turboFrameTarget === "_self") {
      turboFrameTarget = turboFrame?.id
    }

    if (turboFrameTarget && turboFrameTarget !== "_top") {
      request.headers["Turbo-Frame"] = turboFrameTarget
    }
  }

  requestSucceededWithResponse(): void {}

  requestStarted(_fetchRequest: FetchRequest): void {}

  requestErrored(_fetchRequest: FetchRequest): void {}

  requestFinished(fetchRequest: FetchRequest): void {
    this.#pendingFetchRequests.delete(fetchRequest)
  }

  requestPreventedHandlingResponse(_fetchRequest: FetchRequest, _fetchResponse: unknown): void {}

  requestFailedWithResponse(_fetchRequest: FetchRequest, _fetchResponse: unknown): void {}

  get #cacheTtl(): number {
    return Number(getMetaContent("turbo-prefetch-cache-time")) || cacheTtl
  }

  #trackPendingFetchRequest(fetchRequest: FetchRequest): void {
    const key = toCacheKey(fetchRequest.url)

    for (const [pendingFetchRequest, location] of this.#pendingFetchRequests) {
      if (toCacheKey(location) === key) {
        pendingFetchRequest.cancel()
        this.#pendingFetchRequests.delete(pendingFetchRequest)
      }
    }

    this.#pendingFetchRequests.set(fetchRequest, fetchRequest.url)
  }

  #usePrefetchedRequest(detail: PrefetchRequestDetail): void {
    const cached = prefetchCache.get(detail.url)

    if (cached && !cached.abortSignal.aborted) {
      // Once adopted, the request must not be canceled by this observer.
      this.#pendingFetchRequests.delete(cached)
      detail.fetchRequest = cached
    }
  }

  #isPrefetchable(link: HTMLAnchorElement): boolean {
    const href = link.getAttribute("href")

    if (!href) return false

    if (unfetchableLink(link)) return false
    if (linkToTheSamePage(link)) return false
    if (linkOptsOut(link)) return false
    if (nonSafeLink(link)) return false
    if (eventPrevented(link)) return false

    return true
  }
}

const unfetchableLink = (link: HTMLAnchorElement) => {
  const target = link.getAttribute("target")

  return (
    link.origin !== document.location.origin ||
    !["http:", "https:"].includes(link.protocol) ||
    (target && target !== "_self")
  )
}

const linkToTheSamePage = (link: HTMLAnchorElement) => {
  return (link.pathname + link.search === document.location.pathname + document.location.search) || getLinkHrefString(link).startsWith("#")
}

const linkOptsOut = (link: HTMLAnchorElement) => {
  if (link.getAttribute("data-turbo-prefetch") === "false") return true
  if (link.getAttribute("data-turbo") === "false") return true

  const turboPrefetchParent = findClosestRecursively(link, "[data-turbo-prefetch]")
  if (turboPrefetchParent && turboPrefetchParent.getAttribute("data-turbo-prefetch") === "false") return true

  return false
}

const nonSafeLink = (link: HTMLAnchorElement) => {
  const turboMethod = link.getAttribute("data-turbo-method")
  if (turboMethod && turboMethod.toLowerCase() !== "get") return true

  if (isUJS(link)) return true
  if (link.hasAttribute("data-turbo-confirm")) return true
  if (link.hasAttribute("data-turbo-stream")) return true

  return false
}

const isUJS = (link: HTMLAnchorElement) => {
  return link.hasAttribute("data-remote") || link.hasAttribute("data-behavior") || link.hasAttribute("data-confirm") || link.hasAttribute("data-method")
}

const eventPrevented = (link: HTMLAnchorElement) => {
  const event = dispatch("turbo:before-prefetch", { target: link, cancelable: true })
  return event.defaultPrevented
}
