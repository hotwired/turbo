import { LRUCache } from "../lru_cache"
import { toCacheKey } from "../url"
import { config } from "../config"
import type { FetchRequest } from "../../http/fetch_request"

class PrefetchCache extends LRUCache<URL, FetchRequest, string> {
  #prefetchTimeout: ReturnType<typeof setTimeout> | null = null
  #maxAges: Record<string, Date> = {}
  #pausingRequests = new Set<FetchRequest>()

  constructor(size = 1) {
    super(size, toCacheKey)
  }

  get prefetchDelay(): number {
    return config.drive.prefetchDelay
  }

  // A prefetch sent while a non-GET request is in flight can carry the cookies that
  // request is about to change, and its response can then change them back.
  pause(request: FetchRequest): void {
    this.#pausingRequests.add(request)
    this.clear()
  }

  resume(request: FetchRequest): void {
    this.#pausingRequests.delete(request)
  }

  putLater(url: URL, request: FetchRequest, ttl: number): void {
    if (this.#pausingRequests.size > 0) return

    this.#prefetchTimeout = setTimeout(() => {
      request.perform()
      this.put(url, request, ttl)
      this.#prefetchTimeout = null
    }, this.prefetchDelay)
  }

  // TODO(types): returns undefined, unlike LRUCache#put which returns the entry
  // @ts-expect-error -- see above
  put(url: URL, request: FetchRequest, ttl = cacheTtl): void {
    super.put(url, request)
    this.#maxAges[toCacheKey(url)] = new Date(new Date().getTime() + ttl)
  }

  override clear(): void {
    super.clear()
    if (this.#prefetchTimeout) clearTimeout(this.#prefetchTimeout)
  }

  override evict(key: string): void {
    super.evict(key)
    delete this.#maxAges[key]
  }

  override has(key: URL): boolean {
    if (super.has(key)) {
      const maxAge: Date | undefined = this.#maxAges[toCacheKey(key)]

      // TODO(types): returns undefined when no max age was recorded; the Date is coerced to a number.
      return (maxAge && (maxAge as unknown as number) > Date.now()) as boolean

    } else {
      return false
    }
  }
}

export const cacheTtl = 10 * 1000
export const prefetchCache = new PrefetchCache()
