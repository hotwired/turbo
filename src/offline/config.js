import { CacheRegistry } from "./cache_registry"

class Config {
  #cacheRegistry = null

  constructor(config) {
    Object.assign(this, config)
  }

  get cacheRegistry() {
    if (!this.#cacheRegistry) {
      this.#cacheRegistry = new CacheRegistry(this.cacheRegistryOptions)
    }
    return this.#cacheRegistry
  }
}

export const config = new Config({
  enabled: false,
  serviceWorkerPath: "/service-worker.js",
  cacheName: "turbo-offline-cache-v1",
  offlinePagePath: "/offline",
  networkTimeout: 3,
  cacheRegistryOptions: {
    databaseName: "turbo-offline-database",
    storeName: "turbo-offline-cache-metadata",
    databaseVersion: 1
  }
})
