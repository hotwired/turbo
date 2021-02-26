import { FormSubmitObserver, FormSubmitObserverDelegate } from "../../observers/form_submit_observer"
import { FrameElement } from "../../elements/frame_element"
import { expandURL, getAction, locationIsVisitable } from "../url"
import { LinkClickObserver, LinkClickObserverDelegate } from "../../observers/link_click_observer"
import { Session } from "../session"
import { getAttribute } from "../../util"

export class FrameRedirector implements LinkClickObserverDelegate, FormSubmitObserverDelegate {
  readonly session: Session
  readonly element: Element
  readonly linkClickObserver: LinkClickObserver
  readonly formSubmitObserver: FormSubmitObserver

  constructor(session: Session, element: Element) {
    this.session = session
    this.element = element
    this.linkClickObserver = new LinkClickObserver(this, element)
    this.formSubmitObserver = new FormSubmitObserver(this, element)
  }

  start() {
    this.linkClickObserver.start()
    this.formSubmitObserver.start()
  }

  stop() {
    this.linkClickObserver.stop()
    this.formSubmitObserver.stop()
  }

  willFollowLinkToLocation(element: Element) {
    return this.shouldRedirect(element)
  }

  followedLinkToLocation(element: Element, url: URL) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.delegate.followedLinkToLocation(element, url)
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

      if (frame) {
        const id = getAttribute("data-turbo-frame", submitter, element) || frame.getAttribute("target")

        if (frame == findClosestFrameElement(element)) {
          return id == "_top"
        } else {
          return true
        }
      } else {
        return false
      }
    }
  }

  private findFrameElement(element: Element, submitter?: HTMLElement) {
    const id = getAttribute("data-turbo-frame", submitter, element)

    if (id && id != "_top") {
      return this.element.querySelector<FrameElement>(`turbo-frame#${id}:not([disabled])`)
    } else {
      return findClosestFrameElement(element)
    }
  }
}

function findClosestFrameElement(element: Element) {
  return element.closest<FrameElement>("turbo-frame:not([disabled])")
}
