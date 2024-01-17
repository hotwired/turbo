
const PREFETCH_DELAY = 100

class PrefetchCache {
  #prefetchTimeout = null
  #prefetched = null

  get(url) {
    if (this.#prefetched && this.#prefetched.url === url && this.#prefetched.expire > Date.now()) {
      return this.#prefetched.request
    }
  }

  setLater(url, request, ttl) {
    this.clear()

    this.#prefetchTimeout = setTimeout(() => {
      request.perform()
      this.set(url, request, ttl)
      this.#prefetchTimeout = null
    }, PREFETCH_DELAY)
  }

  set(url, request, ttl) {
    this.#prefetched = { url, request, expire: new Date(new Date().getTime() + ttl) }
  }

  clear() {
    if (this.#prefetchTimeout) clearTimeout(this.#prefetchTimeout)
    this.#prefetched = null
  }
}

export const cacheTtl = 10 * 1000
export const prefetchCache = new PrefetchCache()
