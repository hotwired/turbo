import { FormSubmitObserver, type FormSubmitObserverDelegate } from "../../observers/form_submit_observer"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, type LinkInterceptorDelegate } from "./link_interceptor"
import { expandURL, getAction, locationIsVisitable } from "../url"

export interface FrameRedirectorSession {
  submissionIsNavigatable(form: HTMLFormElement, submitter?: HTMLElement): boolean
  elementIsNavigatable(element: Element): boolean
}

export class FrameRedirector implements LinkInterceptorDelegate, FormSubmitObserverDelegate {
  declare readonly session: FrameRedirectorSession
  declare readonly element: Element
  declare readonly linkInterceptor: LinkInterceptor
  declare readonly formSubmitObserver: FormSubmitObserver

  constructor(session: FrameRedirectorSession, element: Element) {
    this.session = session
    this.element = element
    this.linkInterceptor = new LinkInterceptor(this, element)
    this.formSubmitObserver = new FormSubmitObserver(this, element)
  }

  start(): void {
    this.linkInterceptor.start()
    this.formSubmitObserver.start()
  }

  stop(): void {
    this.linkInterceptor.stop()
    this.formSubmitObserver.stop()
  }

  // Link interceptor delegate

  shouldInterceptLinkClick(element: Element, _location: string, _event: MouseEvent): boolean {
    return this.#shouldRedirect(element)
  }

  linkClickIntercepted(element: Element, url: string, event: MouseEvent): void {
    const frame = this.#findFrameElement(element)
    if (frame) {
      // FrameController ignores the event argument.
      (frame.delegate as LinkInterceptorDelegate).linkClickIntercepted(element, url, event)

    }
  }

  // Form submit observer delegate

  willSubmitForm(element: HTMLFormElement, submitter?: HTMLElement): boolean {
    return (
      element.closest("turbo-frame") == null &&
      this.#shouldSubmit(element, submitter) &&
      this.#shouldRedirect(element, submitter)
    )
  }

  formSubmitted(element: HTMLFormElement, submitter?: HTMLElement): void {
    const frame = this.#findFrameElement(element, submitter)
    if (frame) {
      frame.delegate.formSubmitted(element, submitter)
    }
  }

  #shouldSubmit(form: HTMLFormElement, submitter?: HTMLElement): boolean {
    const action = getAction(form, submitter)
    const meta = this.element.ownerDocument.querySelector<HTMLMetaElement>(`meta[name="turbo-root"]`)
    const rootLocation = expandURL(meta?.content ?? "/")

    return this.#shouldRedirect(form, submitter) && locationIsVisitable(action, rootLocation)
  }

  #shouldRedirect(element: Element, submitter?: HTMLElement): boolean {
    const isNavigatable =
      element instanceof HTMLFormElement
        ? this.session.submissionIsNavigatable(element, submitter)
        : this.session.elementIsNavigatable(element)

    if (isNavigatable) {
      const frame = this.#findFrameElement(element, submitter)
      return frame ? frame != element.closest("turbo-frame") : false
    } else {
      return false
    }
  }

  #findFrameElement(element: Element, submitter?: HTMLElement): FrameElement | undefined {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame")
    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}
