// Registered as type="module" to use module imports
import { addRule, start, handlers } from "/dist/turbo-offline.js"

addRule({
  match: [
    /\/dynamic\.txt$/
  ],
  handler: handlers.cacheFirst({
    cacheName: "test-cache-first",
    maxAge: 60 * 60 // 1 hour for testing
  })
})

// Take control of all pages immediately when activated
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

start()
