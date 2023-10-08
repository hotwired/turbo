export class FetchRequestObserver {
  started = false

  constructor(delegate, element) {
    this.delegate = delegate
    this.element = element
  }

  start() {
    if (!this.started) {
      this.element.addEventListener("turbo:before-fetch-request", this.#beforeFetchRequest)
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      this.element.removeEventListener("turbo:before-fetch-request", this.#beforeFetchRequest)
      this.started = false
    }
  }

  #beforeFetchRequest = (event) => {
    const { url, fetchOptions } = event.detail

    this.delegate.willFetch(url, fetchOptions)
  }
}
