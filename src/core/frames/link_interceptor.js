import { findLinkFromClickTarget } from "../../util"

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
    if (this.clickEventIsSignificant(event)) {
      this.clickEvent = event
    } else {
      delete this.clickEvent
    }
  }

  linkClicked = (event) => {
    if (this.clickEvent && this.clickEventIsSignificant(event)) {
      if (this.delegate.shouldInterceptLinkClick(event.target, event.detail.url, event.detail.originalEvent)) {
        this.clickEvent.preventDefault()
        event.preventDefault()
        this.delegate.linkClickIntercepted(event.target, event.detail.url, event.detail.originalEvent)
      }
    }
    delete this.clickEvent
  }

  willVisit = (_event) => {
    delete this.clickEvent
  }

  clickEventIsSignificant(event) {
    const target = event.composed ? event.target?.parentElement : event.target
    const element = findLinkFromClickTarget(target) || target

    return element instanceof Element && element.closest("turbo-frame, html") == this.element
  }
}
