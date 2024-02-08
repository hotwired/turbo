import {
  dispatch,
  getLocationForLink,
  getMetaContent,
  findClosestRecursively
} from "../util"

import { StreamMessage } from "../core/streams/stream_message"
import { FetchMethod, FetchRequest } from "../http/fetch_request"
import { prefetchCache, cacheTtl } from "../core/drive/prefetch_cache"

export class LinkPrefetchObserver {
  started = false
  #prefetchedLink = null

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

        prefetchCache.setLater(location.toString(), fetchRequest, this.#cacheTtl)
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
    if (event.target.tagName !== "FORM" && event.detail.fetchOptions.method === "get") {
      const cached = prefetchCache.get(event.detail.url.toString())

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

    if (link.hasAttribute("data-turbo-stream")) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  // Fetch request interface

  requestSucceededWithResponse() {}

  requestStarted(fetchRequest) {}

  requestErrored(fetchRequest) {}

  requestFinished(fetchRequest) {}

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
  if (turboMethod !== "get") return true
  return false
}

const eventPrevented = (link) => {
  const event = dispatch("turbo:before-prefetch", { target: link, cancelable: true })
  return event.defaultPrevented
}
