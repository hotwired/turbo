import {
  doesNotTargetIFrame,
  getLocationForLink,
  getMetaContent,
  findClosestRecursively
} from "../util"

import { FetchMethod, FetchRequest } from "../http/fetch_request"
import { prefetchCache, cacheTtl } from "../core/drive/prefetch_cache"

export class LinkPrefetchObserver {
  started = false
  hoverTriggerEvent = "mouseenter"
  touchTriggerEvent = "touchstart"

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

    this.eventTarget.removeEventListener(this.hoverTriggerEvent, this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    })
    this.eventTarget.removeEventListener(this.touchTriggerEvent, this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    })
    this.eventTarget.removeEventListener("turbo:before-fetch-request", this.#tryToUsePrefetchedRequest, true)
    this.started = false
  }

  #enable = () => {
    this.eventTarget.addEventListener(this.hoverTriggerEvent, this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    })
    this.eventTarget.addEventListener(this.touchTriggerEvent, this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    })
    this.eventTarget.addEventListener("turbo:before-fetch-request", this.#tryToUsePrefetchedRequest, true)
    this.started = true
  }

  #tryToPrefetchRequest = (event) => {
    if (getMetaContent("turbo-prefetch") !== "true") return

    const target = event.target
    const isLink = target.matches && target.matches("a[href]:not([target^=_]):not([download])")

    if (isLink && this.#isPrefetchable(target)) {
      const link = target
      const location = getLocationForLink(link)

      if (this.delegate.canPrefetchRequestToLocation(link, location)) {
        const fetchRequest = new FetchRequest(
          this,
          FetchMethod.get,
          location,
          new URLSearchParams(),
          target
        )

        prefetchCache.setLater(location.toString(), fetchRequest, this.#cacheTtl)

        link.addEventListener("mouseleave", () => prefetchCache.clear(), { once: true })
      }
    }
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

    request.headers["Sec-Purpose"] = "prefetch"

    if (link.dataset.turboFrame && link.dataset.turboFrame !== "_top") {
      request.headers["Turbo-Frame"] = link.dataset.turboFrame
    } else if (link.dataset.turboFrame !== "_top") {
      const turboFrame = link.closest("turbo-frame")

      if (turboFrame) {
        request.headers["Turbo-Frame"] = turboFrame.id
      }
    }

    if (link.hasAttribute("data-turbo-stream")) {
      request.acceptResponseType("text/vnd.turbo-stream.html")
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

    if (!href || href === "#" || link.dataset.turbo === "false" || link.dataset.turboPrefetch === "false") {
      return false
    }

    if (link.origin !== document.location.origin) {
      return false
    }

    if (!["http:", "https:"].includes(link.protocol)) {
      return false
    }

    if (link.pathname + link.search === document.location.pathname + document.location.search) {
      return false
    }

    if (link.dataset.turboMethod && link.dataset.turboMethod !== "get") {
      return false
    }

    if (targetsIframe(link)) {
      return false
    }

    if (link.pathname + link.search === document.location.pathname + document.location.search) {
      return false
    }

    const turboPrefetchParent = findClosestRecursively(link, "[data-turbo-prefetch]")

    if (turboPrefetchParent && turboPrefetchParent.dataset.turboPrefetch === "false") {
      return false
    }

    return true
  }
}

const targetsIframe = (link) => {
  return !doesNotTargetIFrame(link)
}
