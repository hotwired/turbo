// Network-first: try the network, with an optional time out, and if that fails
// fallback to the cache

import { Handler } from "./handler"

export class NetworkFirst extends Handler {
  async handle(request) {
    let response
    let afterHandlePromise
    let timeoutId
    let cacheAttemptedOnTimeout = false

    const networkPromise = this.fetchFromNetwork(request)
    const promises = [networkPromise]

    if (this.networkTimeout) {
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(async () => {
          console.debug(`Network timeout after ${this.networkTimeout}s for ${request.url}, trying the cache...`)

          const cachedResponse = await this.fetchFromCache(request)
          cacheAttemptedOnTimeout = true

          resolve(cachedResponse)
        }, this.networkTimeout * 1000)
      })
      promises.push(timeoutPromise)
    }

    try {
      // Either the network wins or the timeout wins. The network might win
      // with an error, though
      response = await Promise.race(promises)
    } catch(error) {
      console.warn(`${error} fetching from network ${request.url} with timeout`)
    }

    if (timeoutId) clearTimeout(timeoutId)

    if (!response && cacheAttemptedOnTimeout) {
      // In this case we know we hit the timout and got a cache miss.
      // We can wait for the network promise just in case, as we don't have
      // anything to lose, knowing that we don't have the cache as fallback
      try {
        response = await networkPromise
      } catch(error) {
        // This might be the same error we got from the promise race
        console.warn(`${error} fetching from network ${request.url}`)
      }
    } else if (!response) {
      // If we didn't get a response and didn't try the cache, try it now
      // as a fallback
      response = await this.fetchFromCache(request)
    }

    if (response) {
      afterHandlePromise = this.saveToCache(request, response.clone())
    } else {
      afterHandlePromise = Promise.resolve()
    }

    return { response, afterHandlePromise }
  }
}
