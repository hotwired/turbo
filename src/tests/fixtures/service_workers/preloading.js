// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

// Cache-first handler for preloading test resources
TurboOffline.addRule({
  match: /\/__turbo\/preload/,
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-preload"
  })
})

// Take control of all pages immediately when activated
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()
