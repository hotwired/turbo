// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

TurboOffline.addRule({
  match: [
    /\/dynamic\.txt$/
  ],
  handler: TurboOffline.handlers.cacheFirst({
    cacheName: "test-cache-first"
  })
})

// Take control of all pages immediately when activated
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()
