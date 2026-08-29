import { getScrollPosition } from "../util"

export class ScrollObserver {
  started = false
  #root = null
  #paused = false

  constructor(delegate) {
    this.delegate = delegate
  }

  get scrollRoot() {
    if (this.#root instanceof Element && !this.#root.isConnected) {
      this.#root = null
    }
    return this.#root ?? (this.#root = this.#resolveRoot())
  }

  start() {
    if (!this.started) {
      this.#root = null
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

  refresh() {
    this.#root = null
  }

  onScroll = (event) => {
    if (this.#paused) return
    const root = this.scrollRoot
    if (event && !this.#scrollEventTargetsRoot(event.target, root)) return
    this.updatePosition(getScrollPosition(root))
  }

  // Private

  #resolveRoot() {
    const element = document.querySelector("[data-turbo-scroll-root]")
    if (element && element !== document.documentElement && element !== document.body) {
      return element
    } else {
      return window
    }
  }

  #scrollEventTargetsRoot(target, root) {
    if (root === window) {
      return target === document || target === document.documentElement
    } else {
      return target === root
    }
  }

  updatePosition(position) {
    this.delegate.scrollPositionChanged(position)
  }

  #addListener() {
    addEventListener("scroll", this.onScroll, true)
  }

  #removeListener() {
    removeEventListener("scroll", this.onScroll, true)
  }
}
