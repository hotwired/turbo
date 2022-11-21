import { LinkClickObserver, LinkClickObserverDelegate } from "./link_click_observer"
import { TurboSubmitEndEvent } from "../events"

export type FormLinkClickObserverDelegate = {
  willSubmitFormLinkToLocation(link: Element, location: URL, event: MouseEvent): boolean
  submittedFormLinkToLocation(link: Element, location: URL, form: HTMLFormElement): void
}

export class FormLinkClickObserver implements LinkClickObserverDelegate {
  readonly linkInterceptor: LinkClickObserver
  readonly delegate: FormLinkClickObserverDelegate

  constructor(delegate: FormLinkClickObserverDelegate, element: HTMLElement) {
    this.delegate = delegate
    this.linkInterceptor = new LinkClickObserver(this, element)
  }

  start() {
    this.linkInterceptor.start()
  }

  stop() {
    this.linkInterceptor.stop()
  }

  willFollowLinkToLocation(link: Element, location: URL, originalEvent: MouseEvent): boolean {
    return (
      this.delegate.willSubmitFormLinkToLocation(link, location, originalEvent) &&
      link.hasAttribute("data-turbo-method")
    )
  }

  followedLinkToLocation(link: Element, location: URL): void {
    const action = location.href
    const form = document.createElement("form")
    form.setAttribute("data-turbo", "true")
    form.setAttribute("action", action)
    form.setAttribute("hidden", "")

    const method = link.getAttribute("data-turbo-method")
    if (method) form.setAttribute("method", method)

    const turboFrame = link.getAttribute("data-turbo-frame")
    if (turboFrame) form.setAttribute("data-turbo-frame", turboFrame)

    const turboAction = link.getAttribute("data-turbo-action")
    if (turboAction) form.setAttribute("data-turbo-action", turboAction)

    const turboConfirm = link.getAttribute("data-turbo-confirm")
    if (turboConfirm) form.setAttribute("data-turbo-confirm", turboConfirm)

    const turboStream = link.hasAttribute("data-turbo-stream")
    if (turboStream) form.setAttribute("data-turbo-stream", "")

    this.delegate.submittedFormLinkToLocation(link, location, form)

    document.body.appendChild(form)
    form.addEventListener("turbo:submit-end", (_event: TurboSubmitEndEvent) => form.remove(), { once: true })
    requestAnimationFrame(() => form.requestSubmit())
  }
}
