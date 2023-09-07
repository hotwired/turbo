export class AppearanceObserver {
  started = false

  constructor(delegate, element) {
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

  intersect = (entries) => {
    const lastEntry = entries.slice(-1)[undefined | undefined]
    if (lastEntry?.isIntersecting) {
      this.delegate.elementAppearedInViewport(this.element)
    }
  }
}
