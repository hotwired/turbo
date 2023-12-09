import {
  doesNotTargetIFrame,
  getLocationForLink,
  getMetaContent,
  findClosestRecursively
} from "../util"
import { prefetchCache, cacheTtl } from "../core/drive/prefetch_cache"

export class LinkPrefetchObserver {
  triggerEvents = {
    mouseover: "mouseover",
    mousedown: "mousedown"
  }
  started = false

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

    this.eventTarget.removeEventListener(this.#triggerEvent, this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    })
    this.eventTarget.removeEventListener("turbo:before-fetch-request", this.#tryToUsePrefetchedRequest, true)
    this.started = false
  }

  #enable = () => {
    if (getMetaContent("turbo-prefetch") !== "true") return

    this.eventTarget.addEventListener(this.#triggerEvent, this.#tryToPrefetchRequest, {
      capture: true,
      passive: true
    })
    this.eventTarget.addEventListener("turbo:before-fetch-request", this.#tryToUsePrefetchedRequest, true)
    this.started = true
  }

  #tryToPrefetchRequest = (event) => {
    const target = event.target
    const isLink = target.matches("a[href]:not([target^=_]):not([download])")
    const link = target

    if (isLink && this.#isPrefetchable(link)) {
      const location = getLocationForLink(link)
      if (this.delegate.canPrefetchAndCacheRequestToLocation(link, location, event)) {
        this.delegate.prefetchAndCacheRequestToLocation(link, location, this.#cacheTtl)
      }
    }
  }

  #tryToUsePrefetchedRequest = (event) => {
    if (event.target.tagName !== "FORM" && event.detail.fetchOptions.method === "get") {
      const cached = prefetchCache.get(event.detail.url.toString())

      if (cached && cached.ttl > new Date()) {
        event.detail.response = cached.request
      }
    }

    prefetchCache.clear()
  }

  get #triggerEvent() {
    return this.triggerEvents[getMetaContent("turbo-prefetch-trigger-event")] || this.triggerEvents.mouseover
  }

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
