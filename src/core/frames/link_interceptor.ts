import { dispatch } from "../../util"

export interface LinkInterceptorDelegate {
  shouldInterceptLinkClick(element: Element, url: string): boolean
  linkClickIntercepted(element: Element, url: string): void
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
        
        this.convertLinkWithMethodClickToFormSubmission(event.target) || 
          this.delegate.linkClickIntercepted(event.target, event.detail.url)
      }
    }
    delete this.clickEvent
  })

  willVisit = () => {
    delete this.clickEvent
  }

  convertLinkWithMethodClickToFormSubmission(link: Element) {
    const linkMethod = link.getAttribute("data-turbo-method") || link.getAttribute("data-method")

    if (linkMethod) {
      const form = document.createElement("form")
      form.method = linkMethod
      form.action = link.getAttribute("href") || "undefined"

      link.parentNode?.insertBefore(form, link)
      return dispatch("submit", { target: form })
    } else {
      return false
    }
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
