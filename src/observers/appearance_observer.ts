export interface AppearanceObserverDelegate {
  elementAppearedInViewport(element: Element): void
}

export class AppearanceObserver {
  readonly delegate: AppearanceObserverDelegate
  readonly element: Element
  readonly intersectionObserver: IntersectionObserver
  started = false

  constructor(delegate: AppearanceObserverDelegate, element: Element) {
    this.delegate = delegate
    this.element = element
    this.intersectionObserver = new IntersectionObserver(this.intersect)
  }

  start() {
    if (!this.started) {
      this.started = true
      this.intersectionObserver.observe(this.element)
    }
  }

  stop() {
    if (this.started) {
      this.started = false
      this.intersectionObserver.unobserve(this.element)
    }
  }

  intersect: IntersectionObserverCallback = (entries) => {
    const lastEntry = entries.slice(-1)[0]
    if (lastEntry?.isIntersecting) {
      this.delegate.elementAppearedInViewport(this.element)
    }
  }
}
