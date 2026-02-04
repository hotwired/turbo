// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

// Cache-first handler with maxSize limit for testing total size trimming
// The dynamic.txt responses are ~60-70 bytes each, so 150 bytes allows ~2 entries
TurboOffline.addRule({
  match: /\/dynamic\.txt/,
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-max-size",
    maxSize: 150
  })
})

// Take control of all pages immediately when activated
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()
