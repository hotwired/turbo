export class CacheObserver {
  selector = "[data-turbo-temporary]"

  started = false

  start() {
    if (!this.started) {
      this.started = true
      addEventListener("turbo:before-cache", this.removeTemporaryElements, false)
    }
  }

  stop() {
    if (this.started) {
      this.started = false
      removeEventListener("turbo:before-cache", this.removeTemporaryElements, false)
    }
  }

  removeTemporaryElements = (_event) => {
    for (const element of this.temporaryElements) {
      element.remove()
    }
  }

  get temporaryElements() {
    return [...document.querySelectorAll(this.selector)]
  }
}
