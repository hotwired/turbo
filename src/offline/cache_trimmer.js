export class CacheTrimmer {
  #isRunning = false

  constructor(cacheName, cacheRegistry, options = {}) {
    this.cacheName = cacheName
    this.cacheRegistry = cacheRegistry
    this.options = options
  }

  async trim() {
    if (this.#isRunning) {
      return
    }

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
    const { maxAge, maxEntries } = this.options
    return (maxAge && maxAge > 0) || (maxEntries && maxEntries > 0)
  }

  async deleteEntries() {
    // Order: age first, then count (age reduces the set for count trimming)
    if (this.options.maxAge) {
      await this.deleteEntriesByAge()
    }
    if (this.options.maxEntries) {
      await this.deleteEntriesByCount()
    }
  }

  async deleteEntriesByAge() {
    const maxAgeMs = this.options.maxAge * 1000
    const cutoffTimestamp = Date.now() - maxAgeMs

    const expiredEntries = await this.cacheRegistry.getOlderThan(cutoffTimestamp)

    if (expiredEntries.length === 0) {
      return
    }

    console.debug(`Trimming ${expiredEntries.length} expired entries from cache "${this.cacheName}"`)
    await this.#deleteEntryList(expiredEntries)
    console.debug(`Successfully trimmed ${expiredEntries.length} entries from cache "${this.cacheName}"`)
  }

  async deleteEntriesByCount() {
    const currentCount = await this.cacheRegistry.getEntryCount()
    const excess = currentCount - this.options.maxEntries

    if (excess <= 0) {
      return
    }

    const entriesToDelete = await this.cacheRegistry.getOldestEntries(excess)

    if (entriesToDelete.length === 0) {
      return
    }

    console.debug(`Trimming ${entriesToDelete.length} entries (count limit) from cache "${this.cacheName}"`)
    await this.#deleteEntryList(entriesToDelete)
    console.debug(`Successfully trimmed ${entriesToDelete.length} entries from cache "${this.cacheName}"`)
  }

  async #deleteEntryList(entries) {
    const cache = await caches.open(this.cacheName)

    const deletePromises = entries.map(async (entry) => {
      const cacheDeletePromise = cache.delete(entry.key)
      const registryDeletePromise = this.cacheRegistry.delete(entry.key)

      return Promise.all([cacheDeletePromise, registryDeletePromise])
    })

    await Promise.all(deletePromises)
  }
}