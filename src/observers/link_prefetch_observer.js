import { getLocationForLink } from "../core/url"
import {
  dispatch,
  getMetaContent,
  findClosestRecursively
} from "../util"

import { FetchMethod, FetchRequest } from "../http/fetch_request"
import { prefetchCache, cacheTtl } from "../core/drive/prefetch_cache"

export class LinkPrefetchObserver {
  started = false
  #prefetchedLink = null
  #pendingFetchRequests = new Map()

  constructor(delegate, eventTarget) {
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start() {
    if (this.started) return

    if (this.eventTarget.readyState === "loading") {
      this.eventTarget.addEventListener("DOMContentLoaded", this.#enable, { once: true })
    } else {
      this.#enable()
    }
  }

  stop() {
    if (!this.started) return

    this.eventTarget.removeEventListener("mouseenter", this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    })
    this.eventTarget.removeEventListener("mouseleave", this.#cancelRequestIfObsolete, {
      capture: true,
      passive: true
    })

    this.eventTarget.removeEventListener("turbo:before-fetch-request", this.#tryToUsePrefetchedRequest, true)
    this.eventTarget.removeEventListener("turbo:before-visit", this.#cancelPendingFetchRequests, true)
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
    this.eventTarget.addEventListener("turbo:before-visit", this.#cancelPendingFetchRequests, true)
    this.started = true
  }

  #tryToPrefetchRequest = (event) => {
    if (getMetaContent("turbo-prefetch") === "false") return

    const target = event.target
    const isLink = target.matches && target.matches("a[href]:not([target^=_]):not([download])")

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

        // Memorize fetch request and cancel previous one to the same URL
        const url = location.href
        const lastFetchRequest = this.#pendingFetchRequests.get(url)

        if(lastFetchRequest) lastFetchRequest.cancel()
        this.#pendingFetchRequests.set(url, fetchRequest)

        prefetchCache.putLater(location, fetchRequest, this.#cacheTtl)
      }
    }
  }

  #cancelPendingFetchRequests = (event) => {
    if (event.detail.fetchRequest) return

    for (const [url, fetchRequest] of this.#pendingFetchRequests.entries()) {
      if (url !== event.detail.url) {
        fetchRequest.cancel()
        this.#pendingFetchRequests.delete(url)
      }
    }
  }

  #cancelRequestIfObsolete = (event) => {
    if (event.target === this.#prefetchedLink) this.#cancelPrefetchRequest()
  }

  #cancelPrefetchRequest = () => {
    prefetchCache.clear()
    this.#prefetchedLink = null
  }

  #tryToUsePrefetchedRequest = (event) => {
    if (event.target.tagName !== "FORM" && event.detail.fetchOptions.method === "GET") {
      const cached = prefetchCache.get(event.detail.url)

      if (cached) {
        // User clicked link, use cache response
        event.detail.fetchRequest = cached
      }

      prefetchCache.clear()
    }
  }

  prepareRequest(request) {
    const link = request.target

    request.headers["X-Sec-Purpose"] = "prefetch"

    const turboFrame = link.closest("turbo-frame")
    const turboFrameTarget = link.getAttribute("data-turbo-frame") || turboFrame?.getAttribute("target") || turboFrame?.id

    if (turboFrameTarget && turboFrameTarget !== "_top") {
      request.headers["Turbo-Frame"] = turboFrameTarget
    }
  }

  // Fetch request interface

  requestSucceededWithResponse() {}

  requestStarted(fetchRequest) {}

  requestErrored(fetchRequest) {}

  requestFinished(fetchRequest) {
    const url = fetchRequest.url.href

    if(this.#pendingFetchRequests.get(url) === fetchRequest) {
      this.#pendingFetchRequests.delete(url)
    }
  }

  requestPreventedHandlingResponse(fetchRequest, fetchResponse) {}

  requestFailedWithResponse(fetchRequest, fetchResponse) {}

  get #cacheTtl() {
    return Number(getMetaContent("turbo-prefetch-cache-time")) || cacheTtl
  }

  #isPrefetchable(link) {
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

const unfetchableLink = (link) => {
  return link.origin !== document.location.origin || !["http:", "https:"].includes(link.protocol) || link.hasAttribute("target")
}

const linkToTheSamePage = (link) => {
  return (link.pathname + link.search === document.location.pathname + document.location.search) || link.href.startsWith("#")
}

const linkOptsOut = (link) => {
  if (link.getAttribute("data-turbo-prefetch") === "false") return true
  if (link.getAttribute("data-turbo") === "false") return true

  const turboPrefetchParent = findClosestRecursively(link, "[data-turbo-prefetch]")
  if (turboPrefetchParent && turboPrefetchParent.getAttribute("data-turbo-prefetch") === "false") return true

  return false
}

const nonSafeLink = (link) => {
  const turboMethod = link.getAttribute("data-turbo-method")
  if (turboMethod && turboMethod.toLowerCase() !== "get") return true

  if (isUJS(link)) return true
  if (link.hasAttribute("data-turbo-confirm")) return true
  if (link.hasAttribute("data-turbo-stream")) return true

  return false
}

const isUJS = (link) => {
  return link.hasAttribute("data-remote") || link.hasAttribute("data-behavior") || link.hasAttribute("data-confirm") || link.hasAttribute("data-method")
}

const eventPrevented = (link) => {
  const event = dispatch("turbo:before-prefetch", { target: link, cancelable: true })
  return event.defaultPrevented
}
