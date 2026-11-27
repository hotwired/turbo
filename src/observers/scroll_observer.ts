import type { Position } from "../core/types"

export interface ScrollObserverDelegate {
  scrollPositionChanged(position: Position): void
}

export class ScrollObserver {
  started = false
  declare readonly delegate: ScrollObserverDelegate

  constructor(delegate: ScrollObserverDelegate) {
    this.delegate = delegate
  }

  start(): void {
    if (!this.started) {
      addEventListener("scroll", this.onScroll, false)
      this.onScroll()
      this.started = true
    }
  }

  stop(): void {
    if (this.started) {
      removeEventListener("scroll", this.onScroll, false)
      this.started = false
    }
  }

  onScroll = () => {
    this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset })
  }

  // Private

  updatePosition(position: Position): void {
    this.delegate.scrollPositionChanged(position)
  }
}
