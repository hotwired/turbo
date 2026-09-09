// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

// Cache-first handler with maxEntries limit for testing entry count trimming
TurboOffline.addRule({
  match: /\/dynamic\.txt/,
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-max-entries",
    maxEntries: 3
  })
})

// Take control of all pages immediately when activated
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()
