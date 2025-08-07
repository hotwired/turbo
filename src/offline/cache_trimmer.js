export class CacheTrimmer {
  #isRunning = false

  constructor(cacheName, cacheRegistry, options = {}) {
    this.cacheName = cacheName
    this.cacheRegistry = cacheRegistry
    this.options = options
  }

  async trim() {
    // Skip if already running (simple approach)
    if (this.#isRunning) {
      return
    }

    // Check if we have any trimming options configured
    if (!this.#shouldTrim()) {
      return
    }

    this.#isRunning = true

    try {
      await this.deleteEntries()
    } finally {
      this.#isRunning = false
    }
  }

  #shouldTrim() {
    // For now, only check maxAge. To be extended for maxEntries, maxStorage, etc.
    return this.options.maxAge && this.options.maxAge > 0
  }

  async deleteEntries() {
    if (this.options.maxAge) {
      await this.deleteEntriesByAge()
    }
    // To be extended with other options
  }

  async deleteEntriesByAge() {
    const maxAgeMs = this.options.maxAge * 1000
    const cutoffTimestamp = Date.now() - maxAgeMs

    const expiredEntries = await this.cacheRegistry.getOlderThan(cutoffTimestamp)

    if (expiredEntries.length === 0) {
      return
    }

    console.debug(`Trimming ${expiredEntries.length} expired entries from cache "${this.cacheName}"`)

    const cache = await caches.open(this.cacheName)

    const deletePromises = expiredEntries.map(async (entry) => {
      const cacheDeletePromise = cache.delete(entry.key)
      const registryDeletePromise = this.cacheRegistry.delete(entry.key)

      return Promise.all([cacheDeletePromise, registryDeletePromise])
    })

    await Promise.all(deletePromises)

    console.debug(`Successfully trimmed ${expiredEntries.length} entries from cache "${this.cacheName}"`)
  }
}