import { FormSubmitObserver } from "../../observers/form_submit_observer"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor } from "./link_interceptor"
import { expandURL, getAction, locationIsVisitable } from "../url"

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

  willSubmitForm(element, submitter) {
    return (
      element.closest("turbo-frame") == null &&
      this.#shouldSubmit(element, submitter) &&
      this.#shouldRedirect(element, submitter)
    )
  }

  formSubmitted(element, submitter) {
    const frame = this.#findFrameElement(element, submitter)
    if (frame) {
      frame.delegate.formSubmitted(element, submitter)
    }
  }

  #shouldSubmit(form, submitter) {
    const action = getAction(form, submitter)
    const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`)
    const rootLocation = expandURL(meta?.content ?? "/")

    return this.#shouldRedirect(form, submitter) && locationIsVisitable(action, rootLocation)
  }

  #shouldRedirect(element, submitter) {
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

  #findFrameElement(element, submitter) {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame")
    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}
