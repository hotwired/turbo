import { CacheRegistry } from "./cache_registry"

class Config {
  #cacheRegistry = null

  constructor(config) {
    Object.assign(this, config)
  }
}

export const config = new Config({
  enabled: false,
  serviceWorker: {
    location: "/service-worker.js",
    scope: "/"
  },
  cacheName: "turbo-offline-cache-v1",
  offlinePagePath: null,
  networkTimeout: 3,
})
