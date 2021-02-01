import { NavigationElement } from './navigation-element'

export interface LinkInterceptorDelegate {
  shouldInterceptLinkClick(element: Element, url: string): boolean
  linkClickIntercepted(element: NavigationElement): void
}

export class LinkInterceptor {
  readonly delegate: LinkInterceptorDelegate
  readonly element: Element
  private clickEvent?: Event

  constructor(delegate: LinkInterceptorDelegate, element: Element) {
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

  clickBubbled = (event: Event) => {
    if (this.respondsToEventTarget(event.target)) {
      this.clickEvent = event
    } else {
      delete this.clickEvent
    }
  }

  linkClicked = <EventListener>((event: CustomEvent) => {
    if (this.clickEvent && this.respondsToEventTarget(event.target) && event.target instanceof Element) {
      if (this.delegate.shouldInterceptLinkClick(event.target, event.detail.url)) {
        this.clickEvent.preventDefault()
        event.preventDefault()
        const navigationElement = new NavigationElement(event.target, event.detail.url)
        this.delegate.linkClickIntercepted(navigationElement)
      }
    }
    delete this.clickEvent
  })

  willVisit = () => {
    delete this.clickEvent
  }

  respondsToEventTarget(target: EventTarget | null) {
    const element
      = target instanceof Element
      ? target
        : target instanceof Node
        ? target.parentElement
          : null
    return element && element.closest("turbo-frame, html") == this.element
  }
}
