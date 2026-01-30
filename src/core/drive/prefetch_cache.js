import { LRUCache } from "../lru_cache"
import { toCacheKey } from "../url"
import { config } from "../config"

class PrefetchCache extends LRUCache {
  #prefetchTimeout = null
  #maxAges = {}

  constructor(size = 1) {
    super(size, toCacheKey)
  }

  get prefetchDelay() {
    return config.drive.prefetchDelay
  }

  putLater(url, request, ttl) {
    this.#prefetchTimeout = setTimeout(() => {
      request.perform()
      this.put(url, request, ttl)
      this.#prefetchTimeout = null
    }, this.prefetchDelay)
  }

  put(url, request, ttl = cacheTtl) {
    super.put(url, request)
    this.#maxAges[toCacheKey(url)] = new Date(new Date().getTime() + ttl)
  }

  clear() {
    super.clear()
    if (this.#prefetchTimeout) clearTimeout(this.#prefetchTimeout)
  }

  evict(key) {
    super.evict(key)
    delete this.#maxAges[key]
  }

  has(key) {
    if (super.has(key)) {
      const maxAge = this.#maxAges[toCacheKey(key)]

      return maxAge && maxAge > Date.now()
    } else {
      return false
    }
  }
}

export const cacheTtl = 10 * 1000
export const prefetchCache = new PrefetchCache()
