import { Rule } from "./rule"
import { deleteCacheRegistries } from "./cache_registry"

export class ServiceWorker {
  #started = false
  #rules = []

  addRule(rule) {
    this.#rules.push(new Rule(rule))
  }

  start() {
    this.#warnIfNoRulesConfigured()

    if (!this.#started) {
      self.addEventListener("install", this.installed)
      self.addEventListener("message", this.messageReceived)
      self.addEventListener("fetch", this.fetch)
      this.#started = true
    }
  }

  installed = (event) => {
    // Just log for now
    console.log("Service worker installed")
  }

  messageReceived = (event) => {
    if (this[event.data.action]) {
      const actionCall = this[event.data.action](event.data.params)
      event.waitUntil(actionCall)
    }
  }

  fetch = (event) => {
    if (this.#canInterceptRequest(event.request)) {
      const rule = this.#findMatchingRule(event.request)
      if (!rule) return

      const response = rule.handle(event)
      event.respondWith(response)
    }
  }

  async preloadResources({ urls }) {
    for (const url of urls) {
      const request = new Request(url)
      const rule = this.#findMatchingRule(request)
      if (!rule) continue

      try {
        const response = await fetch(url)
        await rule.handler.saveToCache(request, response)
      } catch (error) {
        console.debug(`Preloading failed for ${url}:`, error)
      }
    }
  }

  async clearCache() {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((name) => caches.delete(name)))
    await deleteCacheRegistries()
  }

  #warnIfNoRulesConfigured() {
    if (this.#rules.length === 0) {
      console.warn("No rules configured for service worker. No requests will be intercepted.")
    }
  }

  #canInterceptRequest(request) {
    const url = new URL(request.url, location.href)
    return request.method === "GET" && url.protocol.startsWith('http')
  }

  #findMatchingRule(request) {
    return this.#rules.find((rule) => rule.matches(request))
  }
}
