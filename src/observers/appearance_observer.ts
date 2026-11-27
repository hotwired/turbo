export interface AppearanceObserverDelegate<T extends Element> {
  elementAppearedInViewport(element: T): void
}

export class AppearanceObserver<T extends Element> {
  started = false
  declare readonly delegate: AppearanceObserverDelegate<T>
  declare readonly element: T
  declare readonly intersectionObserver: IntersectionObserver

  constructor(delegate: AppearanceObserverDelegate<T>, element: T) {
    this.delegate = delegate
    this.element = element
    this.intersectionObserver = new IntersectionObserver(this.intersect)
  }

  start(): void {
    if (!this.started) {
      this.started = true
      this.intersectionObserver.observe(this.element)
    }
  }

  stop(): void {
    if (this.started) {
      this.started = false
      this.intersectionObserver.unobserve(this.element)
    }
  }

  intersect = (entries: IntersectionObserverEntry[]) => {
    const lastEntry = entries.slice(-1)[0]
    if (lastEntry?.isIntersecting) {
      this.delegate.elementAppearedInViewport(this.element)
    }
  }
}
