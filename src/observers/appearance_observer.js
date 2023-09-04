export interface AppearanceObserverDelegate<T extends Element> {
  elementAppearedInViewport(element: T): void
}

export class AppearanceObserver<T extends Element> {
  readonly delegate: AppearanceObserverDelegate<T>
  readonly element: T
  readonly intersectionObserver: IntersectionObserver
  started = false

  constructor(delegate: AppearanceObserverDelegate<T>, element: T) {
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
