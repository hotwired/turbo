import { CacheFirst } from "./cache_first"
import { NetworkFirst } from "./network_first"
import { StaleWhileRevalidate } from "./stale_while_revalidate"

export const cacheFirst = (config) => new CacheFirst(config)
export const networkFirst = (config) => new NetworkFirst(config)
export const staleWhileRevalidate = (config) => new StaleWhileRevalidate(config)
