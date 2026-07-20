export class ScrollObserver {
  started = false
  #paused = false

  constructor(delegate) {
    this.delegate = delegate
  }

  get scrollRoot() {
    return window
  }

  start() {
    if (!this.started) {
      this.#paused = false
      this.#addListener()
      this.onScroll()
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      this.#removeListener()
      this.started = false
    }
  }

  pause() {
    this.#paused = true
  }

  resume() {
    this.#paused = false
  }

  onScroll = () => {
    if (this.#paused) return
    const root = this.scrollRoot
    this.updatePosition({ x: root.pageXOffset, y: root.pageYOffset })
  }

  // Private

  updatePosition(position) {
    this.delegate.scrollPositionChanged(position)
  }

  #addListener() {
    addEventListener("scroll", this.onScroll, false)
  }

  #removeListener() {
    removeEventListener("scroll", this.onScroll, false)
  }
}
