import { KeyValueStoreWithTimestamp } from "./key_value_store"
import { config } from "./config"

export class ServiceWorker {
  #started = false

  start() {
    if (!this.#started) {
      self.addEventListener("install", this.installed)
      self.addEventListener("message", this.messageReceived)
      self.addEventListener("fetch", this.fetch)
      this.#started = true
    }
  }

  messageReceived = (event) => {
    if (this[event.data.action]) {
      const actionCall = this[event.data.action](event.data.params)
      event.waitUntil(actionCall)
    }
  }

  fetch = (event) => {
    if (this.#shouldInterceptRequest(event.request)) {
      const responsePromise = this.#handleRequest(event.request)
      if (responsePromise) { event.respondWith(responsePromise) }
    }
  }

  #buildCacheKey(requestOrUrl, response) {
    // If the response is HTML, cache always based on the final response's requestOrUrl url, so
    // that Turbo HTTP location redirects are not masked. Otherwise, cached based on the
    // original request url, so redirected images, resources, etc are available offline.
    // We don't have a response when responding from the cache because we're offline, so
    // in that case, we need to use the request's URL always.
    const request = new Request(requestOrUrl)
    const url = response && this.#isHtmlResponse(response) ? response.url : request.url
    return new URL(url, location.href).href
  }

  get keyValueStore() {
    return new KeyValueStoreWithTimestamp(config.keyValueStore)
  }

  #shouldInterceptRequest(request) {
    const url = new URL(request.url, location.href)
    return request.method === "GET" && url.protocol.startsWith('http')
  }

  #cacheableResponse(response) {
    // Opaque responses have a 0 status (and type == 'opaque')
    return response.status === 200 || response.status === 0
  }

  #handleRequest(request) {
    let responsePromise = null

    try {
      responsePromise = this.#forwardRequestOrServeFromCache(request)
    } catch (error) {
      responsePromise = Promise.reject(error)
    }

    if (!responsePromise) {
      responsePromise = Promise.reject(new Error(`Error handling request to ${request.url}`))
    }

    return responsePromise
  }

  async #forwardRequestOrServeFromCache(request) {
    if (!navigator.onLine) {
      return this.#serveFromCache(request)
    } else {
      try {
        const response = await this.#forwardRequest(request)
        this.#cacheOnVisit(request, response.clone())

        return response
      } catch (error) {
        console.debug(`Failed to forward request for ${request.url}: ${error.message}`)

        return this.#serveFromCache(request)
      }
    }
  }

  async #cacheOnVisit(request, response) {
    if (this.#cacheableResponse(response) && this.#shouldCacheResponseOnVisit(request, response)) {
      const cacheKeyUrl = this.#buildCacheKey(request, response)

      const cache = await caches.open(config.cacheName)
      await cache.put(cacheKeyUrl, response)
      await this.keyValueStore.put(cacheKeyUrl)
    }
  }

  #shouldCacheResponseOnVisit(request, response) {
    return true
  }

  #matchAnyPattern(patterns, string) {
    if (patterns && string) {
      return patterns.some(pattern => new RegExp(pattern).test(string))
    }
  }

  async #serveFromCache(request) {
    const cacheKeyUrl = this.#buildCacheKey(request)

    let response = await caches.match(cacheKeyUrl, { ignoreVary: true })

    if (response === undefined && this.#isHtmlRequest(request)) {
      response = await caches.match(config.offlinePagePath)
    } else if (response !== undefined && request.redirect === "manual" && response.redirected) {
      // Can't respond with a redirected response to a request
      // whose redirect mode is not "follow". Since we can't cache
      // the request with manual redirect mode because these might be
      // crawled in advance, when we don't know how these will be requested,
      // we just return the body here.
      response = new Response(response.body, { headers: response.headers, status: response.status, url: response.url })
    }

    if (response === undefined) { throw new Error(`Request for ${request.url} not cached`) }

    return response
  }

  #isHtmlRequest(request) {
    return request.headers.get("accept")?.includes("text/html")
  }

  #isHtmlResponse(response) {
    return response.headers.get("content-type")?.includes("text/html")
  }

  async #forwardRequest(request) {
    const referrer = request.referrer
    return await fetch(request, { referrer })
  }
}
