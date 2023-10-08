export class LinkInterceptor {
  constructor(delegate, element) {
    this.delegate = delegate
    this.element = element
  }

  start() {
    this.element.addEventListener("click", this.clickBubbled)
    document.addEventListener("turbo:click", this.linkClicked)
    document.addEventListener("turbo:before-visit", this.willVisit)
  }

  stop() {
    this.element.removeEventListener("click", this.clickBubbled)
    document.removeEventListener("turbo:click", this.linkClicked)
    document.removeEventListener("turbo:before-visit", this.willVisit)
  }

  clickBubbled = (event) => {
    if (this.respondsToEventTarget(event.target)) {
      this.clickEvent = event
    } else {
      delete this.clickEvent
    }
  }

  linkClicked = (event) => {
    if (this.clickEvent && this.respondsToEventTarget(event.target) && event.target instanceof Element) {
      const linkOrCustomElement = event.target
      const actuallyClickedLink = (linkOrCustomElement.shadowRoot && !linkOrCustomElement.hasAttribute("data-turbo-frame"))
        ? event.composedPath()[0] : linkOrCustomElement

      if (this.delegate.shouldInterceptLinkClick(actuallyClickedLink, event.detail.url, event.detail.originalEvent)) {
        this.clickEvent.preventDefault()
        event.preventDefault()
        this.delegate.linkClickIntercepted(actuallyClickedLink, event.detail.url, event.detail.originalEvent)
      }
    }
    delete this.clickEvent
  }

  willVisit = (_event) => {
    delete this.clickEvent
  }

  respondsToEventTarget(target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
    return element && element.closest("turbo-frame, html") == this.element
  }
}
