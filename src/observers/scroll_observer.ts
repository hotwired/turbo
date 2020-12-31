import { Position } from "../core/types"

export interface ScrollObserverDelegate {
  scrollPositionChanged(position: Position): void
}

export class ScrollObserver {
  readonly delegate: ScrollObserverDelegate
  started = false

  constructor(delegate: ScrollObserverDelegate) {
    this.delegate = delegate
  }

  get position(): Position {
    return { x: window.pageXOffset, y: window.pageYOffset }
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
    this.updatePosition(this.position)
  }

  // Private

  updatePosition(position: Position) {
    this.delegate.scrollPositionChanged(position)
  }
}
