// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

// Cache-first handler with very short maxAge for testing cache trimming
TurboOffline.addRule({
  match: /\/dynamic\.txt/,
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-cache-trimming-short",
    maxAge: 0.5 // Only 500ms for testing
  })
})

// Network-first handler with longer maxAge to verify selective trimming
TurboOffline.addRule({
  match: /\/dynamic\.json$/,
  handler: TurboOffline.handlers.networkFirst({
    cacheName: "test-cache-stable",
    maxAge: 300 // 5 minutes - much longer than the test duration
  })
})

// Take control of all pages immediately when activated
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()