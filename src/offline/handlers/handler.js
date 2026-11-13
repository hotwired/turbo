import { CacheRegistry, deleteCacheRegistries } from "../cache_registry"
import { CacheTrimmer } from "../cache_trimmer"
import { buildPartialResponse } from "../range_request"

export class Handler {
  constructor({ cacheName, networkTimeout, maxAge, maxEntries, maxEntrySize, fetchOptions }) {
    this.cacheName = cacheName
    this.networkTimeout = networkTimeout
    this.fetchOptions = fetchOptions || {}
    this.maxEntrySize = maxEntrySize

    this.cacheRegistry = new CacheRegistry(cacheName)
    this.cacheTrimmer = new CacheTrimmer(cacheName, this.cacheRegistry, { maxAge, maxEntries })
  }

  async handle(request) {
    // Abstract method
  }

  async fetchFromCache(request) {
    const cacheKeyUrl = buildCacheKey(request)
    let response = await caches.match(cacheKeyUrl, { ignoreVary: true })

    // Handle Range requests for cached responses (audio/video streaming)
    if (response !== undefined && request.headers.has("range")) {
      response = await buildPartialResponse(request, response)
    }

    if (response !== undefined && request.redirect === "manual" && response.redirected) {
      // Can't respond with a redirected response to a request
      // whose redirect mode is not "follow". Since we can't cache
      // the request with manual redirect mode because these might be
      // crawled in advance, when we don't know how these will be requested,
      // we just return the body here.
      response = new Response(response.body, { headers: response.headers, status: response.status, url: response.url })
    }

    return response
  }

  async fetchFromNetwork(request) {
    // Setting the referrer so that it doesn't appear as the service worker
    const referrer = request.referrer
    return await fetch(request, { referrer, ...this.fetchOptions })
  }

  async saveToCache(request, response) {
    if (response && this.canCacheResponse(response)) {
      if (this.maxEntrySize && this.maxEntrySize > 0) {
        const size = await this.#getResponseSize(response)

        if (size === null) {
          console.warn(`Cannot determine size for opaque response to "${request.url}". Consider using fetchOptions: { mode: "cors" } if the server supports CORS. maxEntrySize check skipped.`)
        } else if (size > this.maxEntrySize) {
          console.debug(`Skipping cache for "${request.url}": response size ${size} exceeds maxEntrySize ${this.maxEntrySize}`)
          return
        }
      }

      const cacheKeyUrl = buildCacheKey(request, response)
      const cache = await caches.open(this.cacheName)

      const cachePromise = cache.put(cacheKeyUrl, response)
      const registryPromise = this.cacheRegistry.put(cacheKeyUrl)
      const trimPromise = this.cacheTrimmer.trim()

      return Promise.all([ cachePromise, registryPromise, trimPromise ]).catch(async (error) => {
        if (this.#isQuotaExceededError(error)) {
          await this.#clearAllStorage()
        }
        throw error
      })
    }
  }

  async #getResponseSize(response) {
    if (response.type === "opaque" || response.status === 0) {
      return null
    }

    const contentLength = response.headers.get("Content-Length")
    if (contentLength) {
      return parseInt(contentLength, 10)
    }

    const clone = response.clone()
    const blob = await clone.blob()
    return blob.size
  }

  canCacheResponse(response) {
    // OK response and opaque responses (due to CORS), that have a 0 status
    return response.status === 200 || response.status === 0
  }

  #isQuotaExceededError(error) {
    return error?.name === "QuotaExceededError" ||
      (error?.inner && error.inner.name === "QuotaExceededError")
  }

  async #clearAllStorage() {
    const cacheNames = await caches.keys()

    for (const cacheName of cacheNames) {
      await caches.delete(cacheName)
    }

    await deleteCacheRegistries()
  }
}

function buildCacheKey(requestOrUrl, response) {
  // If the response is HTML, cache always based on the final response's request url, so
  // that Turbo HTTP location redirects are not masked. Otherwise, cached based on the
  // original request url, so redirected images, resources, etc are available offline.
  // We don't have a response when responding from the cache because, so in that case,
  // we need to use the request's URL always. This is also the case when we want to
  // check the URL in our key-value store to see if we have a fresh version already.
  const request = new Request(requestOrUrl)
  const url = response && isHtmlResponse(response) ? response.url : request.url
  return new URL(url, location.href).href
}

function isHtmlResponse(response) {
  return response.headers.get("content-type")?.includes("text/html")
}
