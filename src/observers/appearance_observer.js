export class AppearanceObserver {
  started = false

  constructor(delegate, element) {
    this.delegate = delegate
    this.element = element
  }

  start() {
    if (!this.started) {
      this.started = true

      if (!this.intersectionObserver) {
        const rootMargin = this.element.getAttribute("data-turbo-lazy-root-margin") || "0px"
        this.intersectionObserver = new IntersectionObserver(this.intersect, { rootMargin })
      }

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
    const lastEntry = entries.slice(-1)[0]
    if (lastEntry?.isIntersecting) {
      this.delegate.elementAppearedInViewport(this.element)
    }
  }
}
