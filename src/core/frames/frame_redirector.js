import { FormSubmitObserver } from "../../observers/form_submit_observer"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor } from "./link_interceptor"
import { expandURL, locationIsVisitable } from "../url"

export class FrameRedirector {
  constructor(session, element) {
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

  // Link interceptor delegate

  shouldInterceptLinkClick(element, _location, _event) {
    return this.#shouldRedirect(element)
  }

  linkClickIntercepted(element, url, event) {
    const frame = this.#findFrameElement(element)
    if (frame) {
      frame.delegate.linkClickIntercepted(element, url, event)
    }
  }

  // Form submit observer delegate

  willSubmitForm(htmlFormSubmission) {
    return (
      htmlFormSubmission.closest("turbo-frame") == null &&
      this.#shouldSubmit(htmlFormSubmission) &&
      this.#shouldRedirect(htmlFormSubmission)
    )
  }

  formSubmitted(htmlFormSubmission) {
    const frame = this.#findFrameElement(htmlFormSubmission)
    if (frame) {
      frame.delegate.formSubmitted(htmlFormSubmission)
    }
  }

  #shouldSubmit(htmlFormSubmission) {
    const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`)
    const rootLocation = expandURL(meta?.content ?? "/")

    return this.#shouldRedirect(htmlFormSubmission) && locationIsVisitable(htmlFormSubmission.location, rootLocation)
  }

  #shouldRedirect(elementOrSubmission) {
    const isNavigatable =
      elementOrSubmission instanceof Element
        ? this.session.elementIsNavigatable(elementOrSubmission)
        : this.session.submissionIsNavigatable(elementOrSubmission)

    if (isNavigatable) {
      const frame = this.#findFrameElement(elementOrSubmission)
      return frame ? frame != elementOrSubmission.closest("turbo-frame") : false
    } else {
      return false
    }
  }

  #findFrameElement(elementOrSubmission) {
    const id =
      elementOrSubmission instanceof Element
        ? elementOrSubmission.getAttribute("data-turbo-frame")
        : elementOrSubmission.frame

    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}
