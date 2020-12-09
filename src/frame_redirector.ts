import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FrameElement } from "./frame_element"
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

  shouldInterceptFormSubmission(element: HTMLFormElement) {
    return this.shouldRedirect(element)
  }

  formSubmissionIntercepted(element: HTMLFormElement) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.formSubmissionIntercepted(element)
    }
  }

  private shouldRedirect(element: Element) {
    const frame = this.findFrameElement(element)
    return frame ? frame != element.closest("turbo-frame") : false
  }

  private findFrameElement(element: Element) {
    const id = element.getAttribute("data-turbo-frame")
    if (id && id != "top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}
