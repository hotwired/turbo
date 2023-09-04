export class ScrollObserver {
  started = false

  constructor(delegate) {
    this.delegate = delegate
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
    this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset })
  }

  // Private

  updatePosition(position) {
    this.delegate.scrollPositionChanged(position)
  }
}
