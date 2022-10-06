import { FormSubmitObserver, FormSubmitObserverDelegate } from "../../observers/form_submit_observer"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"
import { expandURL, getAction, locationIsVisitable } from "../url"
import { TurboClickEvent } from "../session"
import { dispatch } from "../../util"

export class FrameRedirector implements LinkInterceptorDelegate, FormSubmitObserverDelegate {
  readonly element: Element
  readonly linkInterceptor: LinkInterceptor
  readonly formSubmitObserver: FormSubmitObserver

  constructor(element: Element) {
    this.element = element
    this.linkInterceptor = new LinkInterceptor(this, element)
    this.formSubmitObserver = new FormSubmitObserver(this, element)
  }

  start() {
    this.linkInterceptor.start()
    this.formSubmitObserver.start()
  }

  stop() {
    this.linkInterceptor.stop()
    this.formSubmitObserver.stop()
  }

  shouldInterceptLinkClick(element: Element, url: string, originalEvent: MouseEvent) {
    return this.shouldRedirect(element) && this.frameAllowsVisitingLocation(element, url, originalEvent)
  }

  linkClickIntercepted(element: Element, url: string, originalEvent: MouseEvent) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.delegate.linkClickIntercepted(element, url, originalEvent)
    }
  }

  willSubmitForm(element: HTMLFormElement, submitter?: HTMLElement) {
    return (
      element.closest("turbo-frame") == null &&
      this.shouldSubmit(element, submitter) &&
      this.shouldRedirect(element, submitter)
    )
  }

  formSubmitted(element: HTMLFormElement, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    if (frame) {
      frame.delegate.formSubmitted(element, submitter)
    }
  }

  private frameAllowsVisitingLocation(target: Element, url: string, originalEvent: MouseEvent): boolean {
    const event = dispatch<TurboClickEvent>("turbo:click", {
      target,
      detail: { url, originalEvent },
      cancelable: true,
    })

    return !event.defaultPrevented
  }

  private shouldSubmit(form: HTMLFormElement, submitter?: HTMLElement) {
    const action = getAction(form, submitter)
    const meta = this.element.ownerDocument.querySelector<HTMLMetaElement>(`meta[name="turbo-root"]`)
    const rootLocation = expandURL(meta?.content ?? "/")

    return this.shouldRedirect(form, submitter) && locationIsVisitable(action, rootLocation)
  }

  private shouldRedirect(element: Element, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    return frame ? frame != element.closest("turbo-frame") : false
  }

  private findFrameElement(element: Element, submitter?: HTMLElement) {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame")
    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}
