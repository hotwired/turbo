import { LinkClickObserver } from "./link_click_observer"
import { getVisitAction } from "../util"

export class FormLinkClickObserver {
  constructor(delegate, element) {
    this.delegate = delegate
    this.linkInterceptor = new LinkClickObserver(this, element)
  }

  start() {
    this.linkInterceptor.start()
  }

  stop() {
    this.linkInterceptor.stop()
  }

  // Link click observer delegate

  willFollowLinkToLocation(link, location, originalEvent) {
    return (
      this.delegate.willSubmitFormLinkToLocation(link, location, originalEvent) &&
      link.hasAttribute("data-turbo-method")
    )
  }

  followedLinkToLocation(link, location) {
    const form = document.createElement("form")

    const type = "hidden"
    for (const [name, value] of location.searchParams) {
      form.append(Object.assign(document.createElement("input"), { type, name, value }))
    }

    const action = Object.assign(location, { search: "" })
    form.setAttribute("data-turbo", "true")
    form.setAttribute("action", action.href)
    form.setAttribute("hidden", "")

    const method = link.getAttribute("data-turbo-method")
    if (method) form.setAttribute("method", method)

    const turboFrame = link.getAttribute("data-turbo-frame")
    if (turboFrame) form.setAttribute("data-turbo-frame", turboFrame)

    const turboAction = getVisitAction(link)
    if (turboAction) form.setAttribute("data-turbo-action", turboAction)

    const turboConfirm = link.getAttribute("data-turbo-confirm")
    if (turboConfirm) form.setAttribute("data-turbo-confirm", turboConfirm)

    const turboStream = link.hasAttribute("data-turbo-stream")
    if (turboStream) form.setAttribute("data-turbo-stream", "")

    this.delegate.submittedFormLinkToLocation(link, location, form)

    document.body.appendChild(form)
    form.addEventListener("turbo:submit-end", () => form.remove(), { once: true })
    requestAnimationFrame(() => form.requestSubmit())
  }
}
