import { Rule } from "./rule"

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
