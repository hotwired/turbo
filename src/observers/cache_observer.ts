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

  get staleElements(): HTMLElement[] {
    return [ ...document.querySelectorAll('[data-turbo-cache="false"]') ] as any
  }

  removeStaleElements() {
    for (const element of this.staleElements) {
       element.remove()
     }
  }
}
