import { removeTemporaryElementsFrom } from "../util"

export class CacheObserver {
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
    removeTemporaryElementsFrom(document)
  }
}
