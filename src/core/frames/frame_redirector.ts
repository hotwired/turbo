import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"
import { Session } from "../session";
import { NavigationElement } from "./navigation-element";

export class FrameRedirector implements LinkInterceptorDelegate, FormInterceptorDelegate {
  readonly element: Element
  readonly session: Session
  readonly linkInterceptor: LinkInterceptor
  readonly formInterceptor: FormInterceptor

  constructor(element: Element, session: Session) {
    this.element = element
    this.session = session
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

  linkClickIntercepted(navigationElement: NavigationElement) {
    const frame = this.findFrameElement(navigationElement.element)
    if (frame) {
      frame.delegate.setNavigationElement(navigationElement)
      frame.src = navigationElement.url
    }
  }

  shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement) {
    return this.shouldRedirect(element, submitter)
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.delegate.formSubmissionIntercepted(element, submitter)
    }
  }

  private shouldRedirect(element: Element, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element)
    return frame ? frame != element.closest("turbo-frame") : false
  }

  private findFrameElement(element: Element) {
    const id = element.getAttribute("data-turbo-frame")
    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}
