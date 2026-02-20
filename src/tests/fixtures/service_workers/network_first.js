// Registered as type="classic", can't use module imports
importScripts("/dist/turbo-offline-umd.js")

TurboOffline.addRule({
  match: [
    /\/dynamic\.txt$/
  ],
  handler: TurboOffline.handlers.networkFirst({
    cacheName: "test-network-first",
    networkTimeout: 0.5 // Short timeout for testing
  })
})

// Take control of all pages immediately when activated
self.addEventListener("activate", (event) => {
  console.log("Network-first service worker activated")
  event.waitUntil(self.clients.claim())
})

// Start the service worker
TurboOffline.start()
