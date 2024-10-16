export class CacheObserver {
  selector = "[data-turbo-temporary]"
  deprecatedSelector = "[data-turbo-cache=false]"

  started = false

  start() {
    if (!this.started) {
      this.started = true
      addEventListener("turbo:before-cache", this.removeTemporaryElements, false)
      addEventListener("pagehide", this.removeTemporaryElementsPriorToEnteringBackForwardCache, false)
    }
  }

  stop() {
    if (this.started) {
      this.started = false
      removeEventListener("turbo:before-cache", this.removeTemporaryElements, false)
      removeEventListener("pagehide", this.removeTemporaryElementsPriorToEnteringBackForwardCache, false)
    }
  }

  removeTemporaryElementsPriorToEnteringBackForwardCache = (event) => {
    if (event.persisted) {
      this.removeTemporaryElements(event)
    }
  }

  removeTemporaryElements = (_event) => {
    for (const element of this.temporaryElements) {
      element.remove()
    }
  }

  get temporaryElements() {
    return [...document.querySelectorAll(this.selector), ...this.temporaryElementsWithDeprecation]
  }

  get temporaryElementsWithDeprecation() {
    const elements = document.querySelectorAll(this.deprecatedSelector)

    if (elements.length) {
      console.warn(
        `The ${this.deprecatedSelector} selector is deprecated and will be removed in a future version. Use ${this.selector} instead.`
      )
    }

    return [...elements]
  }
}
