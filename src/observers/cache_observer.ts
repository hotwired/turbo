export class CacheObserver {
  started = false

  start() {
    if (!this.started) {
      this.started = true
      addEventListener("turbo:before-cache", this.removeStaleElements, false)
    }
  }

  stop() {
    if (this.started) {
      this.started = false
      removeEventListener("turbo:before-cache", this.removeStaleElements, false)
    }
  }

  removeStaleElements() {
    const staleElements = [...document.querySelectorAll('[data-turbo-cache="false"]')]

    for (const element of staleElements) {
      element.remove()
    }
  }
}
