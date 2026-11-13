// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

TurboOffline.addRule({
  match: (request) => request.headers.get("X-Cache") === "yes",
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-cache-first"
  })
})

TurboOffline.addRule({
  match: /\/dynamic\.json$/,
  handler: TurboOffline.handlers.networkFirst({
    cacheName: "test-network-first",
    networkTimeout: 3
  })
})


// Take control of all pages immediately when activated
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()
