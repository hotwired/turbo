export class ScrollObserver {
  started = false

  constructor(delegate) {
    this.delegate = delegate
  }

  get scrollRoot() {
    return window
  }

  start() {
    if (!this.started) {
      addEventListener("scroll", this.onScroll, false)
      this.onScroll()
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      removeEventListener("scroll", this.onScroll, false)
      this.started = false
    }
  }

  onScroll = () => {
    const root = this.scrollRoot
    this.updatePosition({ x: root.pageXOffset, y: root.pageYOffset })
  }

  // Private

  updatePosition(position) {
    this.delegate.scrollPositionChanged(position)
  }
}
