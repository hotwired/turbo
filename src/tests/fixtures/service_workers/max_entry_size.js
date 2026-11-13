// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

// Cache-first handler with maxEntrySize limit for testing individual entry size rejection
// The dynamic.txt responses are ~60-70 bytes, so 50 bytes should reject them
TurboOffline.addRule({
  match: /\/dynamic\.txt/,
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-max-entry-size",
    maxEntrySize: 50
  })
})

// Handler with larger maxEntrySize that should allow caching
TurboOffline.addRule({
  match: /\/dynamic\.json$/,
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-max-entry-size-allowed",
    maxEntrySize: 500
  })
})

// Take control of all pages immediately when activated
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()
