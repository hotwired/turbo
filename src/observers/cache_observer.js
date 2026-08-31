import { removeTemporaryElementsFrom } from "../util"

export class CacheObserver {
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
    removeTemporaryElementsFrom(document)
  }
}
