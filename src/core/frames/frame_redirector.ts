import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"
import { expandURL, getAction, locationIsVisitable } from "../url"

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

  shouldInterceptLinkClick(element: Element, _url: string) {
    return this.shouldRedirect(element)
  }

  linkClickIntercepted(element: Element, url: string) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.delegate.linkClickIntercepted(element, url)
    }
  }

  shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement) {
    return this.shouldSubmit(element, submitter)
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    if (frame) {
      frame.removeAttribute("reloadable")
      frame.delegate.formSubmissionIntercepted(element, submitter)
    }
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
