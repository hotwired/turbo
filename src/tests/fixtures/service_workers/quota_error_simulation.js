// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

// Store original cache.put
const originalCachePut = Cache.prototype.put

// Flag to control quota error simulation
let simulateQuotaError = false

// Monkey-patch cache.put to throw QuotaExceededError when flag is set
Cache.prototype.put = function(request, response) {
  if (simulateQuotaError) {
    const error = new DOMException("Quota exceeded", "QuotaExceededError")
    return Promise.reject(error)
  }
  return originalCachePut.call(this, request, response)
}

// Listen for messages to control quota error simulation
self.addEventListener("message", (event) => {
  if (event.data.type === "SIMULATE_QUOTA_ERROR") {
    simulateQuotaError = event.data.enabled
    event.ports[0].postMessage({ success: true })
  }
})

TurboOffline.addRule({
  match: /\/dynamic\./,
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-quota-error"
  })
})

// Take control of all pages immediately when activated
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()
