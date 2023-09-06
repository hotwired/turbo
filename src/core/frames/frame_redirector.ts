import { FormSubmitObserver, FormSubmitObserverDelegate } from "../../observers/form_submit_observer"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"
import { expandURL, getAction, locationIsVisitable } from "../url"
import { Session } from "../session"
export class FrameRedirector implements LinkInterceptorDelegate, FormSubmitObserverDelegate {
  readonly session: Session
  readonly element: Element
  readonly linkInterceptor: LinkInterceptor
  readonly formSubmitObserver: FormSubmitObserver

  constructor(session: Session, element: Element) {
    this.session = session
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

  shouldInterceptLinkClick(element: Element, _location: string, _event: MouseEvent) {
    return this.shouldRedirect(element)
  }

  linkClickIntercepted(element: Element, url: string, event: MouseEvent) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.delegate.linkClickIntercepted(element, url, event)
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

  private shouldSubmit(form: HTMLFormElement, submitter?: HTMLElement) {
    const action = getAction(form, submitter)
    const meta = this.element.ownerDocument.querySelector<HTMLMetaElement>(`meta[name="turbo-root"]`)
    const rootLocation = expandURL(meta?.content ?? "/")

    return this.shouldRedirect(form, submitter) && locationIsVisitable(action, rootLocation)
  }

  private shouldRedirect(element: Element, submitter?: HTMLElement) {
    const isNavigatable =
      element instanceof HTMLFormElement
        ? this.session.submissionIsNavigatable(element, submitter)
        : this.session.elementIsNavigatable(element)

    if (isNavigatable) {
      const frame = this.findFrameElement(element, submitter)
      return frame ? frame != element.closest("turbo-frame") : false
    } else {
      return false
    }
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
