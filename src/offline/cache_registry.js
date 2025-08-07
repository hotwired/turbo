const DATABASE_NAME = "turbo-offline-database"
const DATABASE_VERSION = 1
const STORE_NAME = "cache-registry"

export class CacheRegistry {
  get(key) {
    const getOp = (store) => this.#requestToPromise(store.get(key))
    return this.#performOperation(STORE_NAME, getOp, "readonly")
  }

  has(key) {
    const countOp = (store) => this.#requestToPromise(store.count(key))
    return this.#performOperation(STORE_NAME, countOp, "readonly").then((result) => result === 1)
  }

  put(key, value) {
    const putOp = (store) => {
      const item = { key: key, timestamp: Date.now(), ...value }
      store.put(item)
      return this.#requestToPromise(store.transaction)
    }

    return this.#performOperation(STORE_NAME, putOp, "readwrite")
  }

  getTimestamp(key) {
    return this.get(key).then((result) => result?.timestamp)
  }

  getOlderThan(timestamp) {
    const getOlderThanOp = (store) => {
      const index = store.index("timestamp")
      const range = IDBKeyRange.upperBound(timestamp, true) // true = exclude timestamp
      const cursorRequest = index.openCursor(range)

      return this.#cursorRequestToPromise(cursorRequest)
    }
    return this.#performOperation(STORE_NAME, getOlderThanOp, "readonly")
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
      // cached URL store
      const cacheMetadataStore = request.result.createObjectStore(STORE_NAME, { keyPath: "key" })
      cacheMetadataStore.createIndex("timestamp", "timestamp", { unique: false })
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
}
