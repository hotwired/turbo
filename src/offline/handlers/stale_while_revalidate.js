/**
 * Stale-while-revalidate: try the cache. If it's a hit, return that and
 * go to the network to fetch a new response and store it. If it's a miss,
 * just fall back to network and then store the response.
 */
import { Handler } from "./handler"

export class StaleWhileRevalidate extends Handler {
  async handle(request) {
    let response = await this.fetchFromCache(request)
    let afterHandlePromise

    if (response) {
      afterHandlePromise = this.revalidateCache(request)
      return { response, afterHandlePromise }
    }

    console.debug(`Cache miss for ${request.url}`)

    try {
      response = await this.fetchFromNetwork(request)
    } catch(error) {
      console.warn(
        `${error} fetching from network ${request.url}`
      )
    }

    if (response) {
      afterHandlePromise = this.saveToCache(request, response.clone())
    } else {
      afterHandlePromise = Promise.resolve()
    }

    return { response, afterHandlePromise }
  }

  async revalidateCache(request) {
    try {
      const response = await this.fetchFromNetwork(request)
      if (response) {
        await this.saveToCache(request, response.clone())
      }
    } catch(error) {
      console.debug(`${error} revalidating cache for ${request.url}`)
    }
  }
}
