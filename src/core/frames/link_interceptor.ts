import { findLinkFromClickTarget } from "../../util"

export interface LinkInterceptorDelegate {
  shouldInterceptLinkClick(element: Element, url: string, originalEvent: MouseEvent): boolean
  linkClickIntercepted(element: Element, url: string, originalEvent: MouseEvent): void
}

type TurboClickEvent = CustomEvent<{ url: string; originalEvent: MouseEvent }>

export class LinkInterceptor {
  declare readonly delegate: LinkInterceptorDelegate
  declare readonly element: Element
  declare clickEvent?: Event

  constructor(delegate: LinkInterceptorDelegate, element: Element) {
    this.delegate = delegate
    this.element = element
  }

  start(): void {
    this.element.addEventListener("click", this.clickBubbled)
    document.addEventListener("turbo:click", this.linkClicked)
    document.addEventListener("turbo:before-visit", this.willVisit)
  }

  stop(): void {
    this.element.removeEventListener("click", this.clickBubbled)
    document.removeEventListener("turbo:click", this.linkClicked)
    document.removeEventListener("turbo:before-visit", this.willVisit)
  }

  clickBubbled = (event: Event) => {
    if (this.clickEventIsSignificant(event)) {
      this.clickEvent = event
    } else {
      delete this.clickEvent
    }
  }

  // Only registered for "turbo:click".
  linkClicked = ((event: TurboClickEvent) => {
    if (this.clickEvent && this.clickEventIsSignificant(event)) {
      const linkOrCustomElement = event.target as Element
      const actuallyClickedLink = (linkOrCustomElement.shadowRoot && !linkOrCustomElement.hasAttribute("data-turbo-frame"))
        ? event.composedPath()[0] as Element : linkOrCustomElement

      if (this.delegate.shouldInterceptLinkClick(actuallyClickedLink, event.detail.url, event.detail.originalEvent)) {
        this.clickEvent.preventDefault()
        event.preventDefault()
        this.delegate.linkClickIntercepted(actuallyClickedLink, event.detail.url, event.detail.originalEvent)
      }
    }
    delete this.clickEvent
  }) as EventListener

  willVisit = (_event: Event) => {
    delete this.clickEvent
  }

  clickEventIsSignificant(event: Event): boolean {
    const target = event.composed ? (event.target as Element | null)?.parentElement : event.target

    const element = findLinkFromClickTarget(target) || target

    return element instanceof Element && element.closest("turbo-frame, html") == this.element
  }
}
