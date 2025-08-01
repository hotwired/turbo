// Cache first: try the cache. If it's a hit, return that. If it's a miss,
// fall back to network and then cache the response.

import { Handler } from "./handler"

export class CacheFirst extends Handler {
  async handle(request) {
    let response = await this.fetchFromCache(request)
    let afterHandlePromise = Promise.resolve()

    if (response) return { response, afterHandlePromise }

    console.debug(`Cache miss for ${request.url}`)

    try {
      response = await this.fetchFromNetwork(request)
    } catch(error) {
      console.warn(`${error} fetching from network ${request.url}`)
    }

    if (response) {
      afterHandlePromise = this.saveToCache(request, response.clone())
    }

    return { response, afterHandlePromise }
  }
}
