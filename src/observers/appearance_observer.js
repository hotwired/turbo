export class AppearanceObserver {
  started = false

  constructor(delegate, element) {
    this.delegate = delegate
    this.element = element
    this.intersectionObserver = new IntersectionObserver(this.intersect, readIntersectionObserverOptions(element))
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
    const lastEntry = entries.slice(-1)[0]
    if (lastEntry?.isIntersecting) {
      this.delegate.elementAppearedInViewport(this.element)
    }
  }
}

function readIntersectionObserverOptions(element) {
  let options = {}

  if (element.hasAttribute("data-intersection-root-selector"))
    options["root"] = document.querySelector(element.getAttribute("data-intersection-root-selector"))

  if (element.hasAttribute("data-intersection-root-margin"))
    options["rootMargin"] = element.getAttribute("data-intersection-root-margin")

  if (element.hasAttribute("data-intersection-threshold")) {
    const threshold = JSON.parse(element.getAttribute("data-intersection-threshold"))

    // only a single threshold value is allowed
    if (typeof threshold === "number") options["threshold"] = threshold
  }

  return options
}
