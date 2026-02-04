const DATABASE_NAME = "turbo-offline-database"
const DATABASE_VERSION = 1
const STORE_NAME = "cache-registry"

export function deleteCacheRegistries() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  }).then(() => {
    cacheRegistryDatabase = null
  })
}

class CacheRegistryDatabase {
  get(key) {
    const getOp = (store) => this.#requestToPromise(store.get(key))
    return this.#performOperation(STORE_NAME, getOp, "readonly")
  }

  has(key) {
    const countOp = (store) => this.#requestToPromise(store.count(key))
    return this.#performOperation(STORE_NAME, countOp, "readonly").then((result) => result === 1)
  }

  put(cacheName, key, value) {
    const putOp = (store) => {
      const item = { key: key, cacheName: cacheName, timestamp: Date.now(), ...value }
      store.put(item)
      return this.#requestToPromise(store.transaction)
    }

    return this.#performOperation(STORE_NAME, putOp, "readwrite")
  }

  getTimestamp(key) {
    return this.get(key).then((result) => result?.timestamp)
  }

  getOlderThan(cacheName, timestamp) {
    const getOlderThanOp = (store) => {
      const index = store.index("cacheNameAndTimestamp")
      // Use compound key range: [cacheName, timestamp]
      const range = IDBKeyRange.bound(
        [cacheName, 0], // start of range
        [cacheName, timestamp], // end of range
        false, // lowerOpen: include lower bound
        true // upperOpen: exclude upper bound
      )
      const cursorRequest = index.openCursor(range)

      return this.#cursorRequestToPromise(cursorRequest)
    }
    return this.#performOperation(STORE_NAME, getOlderThanOp, "readonly")
  }

  getEntryCount(cacheName) {
    const countOp = (store) => {
      const index = store.index("cacheNameAndTimestamp")
      const range = IDBKeyRange.bound(
        [cacheName, 0],
        [cacheName, Infinity]
      )
      return this.#requestToPromise(index.count(range))
    }
    return this.#performOperation(STORE_NAME, countOp, "readonly")
  }

  getOldestEntries(cacheName, limit) {
    const getOldestOp = (store) => {
      const index = store.index("cacheNameAndTimestamp")
      const range = IDBKeyRange.bound(
        [cacheName, 0],
        [cacheName, Infinity]
      )
      const cursorRequest = index.openCursor(range)

      return this.#cursorRequestToPromiseWithLimit(cursorRequest, limit)
    }
    return this.#performOperation(STORE_NAME, getOldestOp, "readonly")
  }

  delete(key) {
    const deleteOp = (store) => this.#requestToPromise(store.delete(key))
    return this.#performOperation(STORE_NAME, deleteOp, "readwrite")
  }

  #performOperation(storeName, operation, mode) {
    return this.#openDatabase().then((database) => {
      const transaction = database.transaction(storeName, mode)
      const store = transaction.objectStore(storeName)
      return operation(store)
    })
  }

  #openDatabase() {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const cacheMetadataStore = request.result.createObjectStore(STORE_NAME, { keyPath: "key" })
      cacheMetadataStore.createIndex("cacheNameAndTimestamp", [ "cacheName", "timestamp" ])
    }

    return this.#requestToPromise(request)
  }

  #requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.oncomplete = request.onsuccess = () => resolve(request.result)
      request.onabort = request.onerror = () => reject(request.error)
    })
  }

  #cursorRequestToPromise(request) {
    return new Promise((resolve, reject) => {
      const results = []

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  #cursorRequestToPromiseWithLimit(request, limit) {
    return new Promise((resolve, reject) => {
      const results = []

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor && results.length < limit) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }
}

let cacheRegistryDatabase = null

function getDatabase() {
  if (!cacheRegistryDatabase) {
    cacheRegistryDatabase = new CacheRegistryDatabase()
  }
  return cacheRegistryDatabase
}

export class CacheRegistry {
  constructor(cacheName) {
    this.cacheName = cacheName
    this.database = getDatabase()
  }

  get(key) {
    return this.database.get(key)
  }

  has(key) {
    return this.database.has(key)
  }

  put(key, value = {}) {
    return this.database.put(this.cacheName, key, value)
  }

  getTimestamp(key) {
    return this.database.getTimestamp(key)
  }

  getOlderThan(timestamp) {
    return this.database.getOlderThan(this.cacheName, timestamp)
  }

  getEntryCount() {
    return this.database.getEntryCount(this.cacheName)
  }

  getOldestEntries(limit) {
    return this.database.getOldestEntries(this.cacheName, limit)
  }

  delete(key) {
    return this.database.delete(key)
  }
}
