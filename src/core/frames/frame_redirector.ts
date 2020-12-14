import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"

export class FrameRedirector implements LinkInterceptorDelegate, FormInterceptorDelegate {
  readonly element: Element
  readonly linkInterceptor: LinkInterceptor
  readonly formInterceptor: FormInterceptor

  constructor(element: Element) {
    this.element = element
    this.linkInterceptor = new LinkInterceptor(this, element)
    this.formInterceptor = new FormInterceptor(this, element)
  }

  start() {
    this.linkInterceptor.start()
    this.formInterceptor.start()
  }

  stop() {
    this.linkInterceptor.stop()
    this.formInterceptor.stop()
  }

  shouldInterceptLinkClick(element: Element, url: string) {
    return this.shouldRedirect(element)
  }

  linkClickIntercepted(element: Element, url: string) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.src = url
    }
  }

  shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement) {
    return this.shouldRedirect(element, submitter)
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    if (frame) {
      frame.delegate.formSubmissionIntercepted(element, submitter)
    }
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
