import { cacheFirst, networkFirst, staleWhileRevalidate } from "./handlers"

export class Rule {
  constructor({ handler, match = /.*/ } = {}) {
    this.handler = handler
    this.match = match
  }

  matches(request) {
    if (typeof this.match === 'function') return this.match(request)

    const regexes = Array.isArray(this.match) ? this.match : [this.match]
    return regexes.some(regex => regex.test(request.url))
  }

  async handle(event) {
    const { response, afterHandlePromise } = await this.handler.handle(event.request)
    event.waitUntil(afterHandlePromise)

    return response
  }
}
