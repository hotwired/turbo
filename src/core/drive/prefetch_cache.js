const PREFETCH_DELAY = 100

class PrefetchCache {
  #prefetchTimeout = null
  #prefetched = null

  get(url) {
    if (this.#prefetched && this.#prefetched.url === url && this.#prefetched.expire > Date.now()) {
      return this.#prefetched.request
    }
  }

  setLater(url, request, ttl, delay) {
    this.clear()

    if (delay === "off") {
      this.#setNow(url, request, ttl)
    } else {
      this.#enqueue(url, request, ttl, PREFETCH_DELAY)
    }
  }

  set(url, request, ttl) {
    this.#prefetched = { url, request, expire: new Date(new Date().getTime() + ttl) }
  }

  clear() {
    if (this.#prefetchTimeout) clearTimeout(this.#prefetchTimeout)
    this.#prefetched = null
  }

  #enqueue(url, request, ttl, delay) {
    this.#prefetchTimeout = setTimeout(() => {
      this.#setNow(url, request, ttl)
      this.#prefetchTimeout = null
    }, delay)
  }

  #setNow(url, request, ttl) {
    request.perform()
    this.set(url, request, ttl)
  }
}

export const cacheTtl = 10 * 1000
export const prefetchCache = new PrefetchCache()
