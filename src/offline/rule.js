export class Rule {
  constructor({ handler, match = /.*/, except } = {}) {
    this.handler = handler
    this.match = match
    this.except = except
  }

  matches(request) {
    return this.#matchesCondition(request, this.match) && !this.#matchesCondition(request, this.except)
  }

  #matchesCondition(request, condition) {
    if (!condition) return false
    if (typeof condition === 'function') return condition(request)

    const regexes = Array.isArray(condition) ? condition : [condition]
    return regexes.some(regex => regex.test(request.url))
  }

  async handle(event) {
    const { response, afterHandlePromise } = await this.handler.handle(event.request)
    event.waitUntil(afterHandlePromise)

    return response
  }
}
