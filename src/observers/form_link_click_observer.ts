import { LinkClickObserver, LinkClickObserverDelegate } from "./link_click_observer"

export type FormLinkClickObserverDelegate = {
  willSubmitFormLinkToLocation(link: Element, location: URL, event: MouseEvent): boolean
  submittedFormLinkToLocation(link: Element, location: URL, form: HTMLFormElement): void
}

export class FormLinkClickObserver implements LinkClickObserverDelegate {
  readonly linkClickObserver: LinkClickObserver
  readonly delegate: FormLinkClickObserverDelegate

  constructor(delegate: FormLinkClickObserverDelegate, element: HTMLElement) {
    this.delegate = delegate
    this.linkClickObserver = new LinkClickObserver(this, element)
  }

  start() {
    this.linkClickObserver.start()
  }

  stop() {
    this.linkClickObserver.stop()
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

    const turboConfirm = link.getAttribute("data-turbo-confirm")
    if (turboConfirm) form.setAttribute("data-turbo-confirm", turboConfirm)

    const turboStream = link.hasAttribute("data-turbo-stream")
    if (turboStream) form.setAttribute("data-turbo-stream", "")

    this.delegate.submittedFormLinkToLocation(link, location, form)

    document.body.appendChild(form)
    form.requestSubmit()
    form.remove()
  }
}
