export async function clearAllCaches(page) {
  return page.evaluate(async () => {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
  })
}

export async function getCachedResponse(page, cacheName, url) {
  return page.evaluate(async ({ cacheName, url }) => {
    const cache = await caches.open(cacheName)
    const response = await cache.match(url)
    if (response) {
      return {
        found: true,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        text: await response.text()
      }
    }

    return { found: false }
  }, { cacheName, url })
}

export async function registerServiceWorker(page, path, scope = "/", type = "classic") {
  return page.evaluate(async ({ path, scope, type }) => {
    return await navigator.serviceWorker.register(path, { scope, type })
  }, { path, scope, type })
}

export async function unregisterServiceWorker(page) {
  return page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(reg => reg.unregister()))
  })
}

export async function testFetch(page, url, headers = {}) {
  return page.evaluate(async ({ url, headers }) => {
    try {
      const response = await fetch(url, { headers })
      return {
        ok: response.ok,
        status: response.status,
        text: await response.text()
      }
    } catch (error) {
      return { error: error.message }
    }
  }, { url, headers })
}

export async function waitForServiceWorkerToControl(page, timeout = 5000) {
  return page.evaluate(async (timeout) => {
    return new Promise((resolve, reject) => {
      if (navigator.serviceWorker.controller) {
        resolve()
        return
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Service worker did not take control within ${timeout}ms`))
      }, timeout)

      const handleControllerChange = () => {
        if (navigator.serviceWorker.controller) {
          clearTimeout(timeoutId)
          navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
          resolve()
        }
      }

      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)
    })
  }, timeout)
}

export async function setNetworkDelay(page, delayMs) {
  return page.request.post("/__turbo/test-control/set-delay", {
    data: { delay: delayMs }
  })
}

export async function setSimulateQuotaError(page, enabled) {
  return page.evaluate(async (enabled) => {
    const registration = await navigator.serviceWorker.ready
    const messageChannel = new MessageChannel()

    return new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => resolve(event.data)
      registration.active.postMessage(
        { type: "SIMULATE_QUOTA_ERROR", enabled },
        [messageChannel.port2]
      )
    })
  }, enabled)
}

export async function getIndexedDBEntryCount(page, databaseName = "turbo-offline-database") {
  return page.evaluate(async (databaseName) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName)
      request.onerror = () => resolve(0)
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains("cache-registry")) {
          db.close()
          resolve(0)
          return
        }
        const transaction = db.transaction("cache-registry", "readonly")
        const store = transaction.objectStore("cache-registry")
        const countRequest = store.count()
        countRequest.onsuccess = () => {
          db.close()
          resolve(countRequest.result)
        }
        countRequest.onerror = () => {
          db.close()
          resolve(0)
        }
      }
    })
  }, databaseName)
}
