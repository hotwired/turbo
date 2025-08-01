export class Handler {
  constructor({ cacheName, maxStorage, maxAge, networkTimeout, cacheRegistry }) {
    this.cacheName = cacheName
    this.maxStorage = maxStorage
    this.maxAge = maxAge
    this.networkTimeout = networkTimeout
    this.cacheRegistry = cacheRegistry
  }

  async handle(request) {
    // Abstract method
  }

  async fetchFromCache(request) {
    const cacheKeyUrl = buildCacheKey(request)
    let response = await caches.match(cacheKeyUrl, { ignoreVary: true })

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
    return await fetch(request, { referrer })
  }

  async saveToCache(request, response) {
    if (response && this.canCacheResponse(response)) {
      const cacheKeyUrl = buildCacheKey(request, response)

      const cache = await caches.open(this.cacheName)
      const cachePromise = cache.put(cacheKeyUrl, response)
      const registryPromise = this.cacheRegistry.put(cacheKeyUrl)
      return Promise.all([ cachePromise, registryPromise ])
    }
  }

  canCacheResponse(response) {
    // OK response and opaque responses (due to CORS), that have a 0 status
    return response.status === 200 || response.status === 0
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
