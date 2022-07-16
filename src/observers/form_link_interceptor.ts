import { LinkInterceptor, LinkInterceptorDelegate } from "../core/frames/link_interceptor"

export type FormLinkInterceptorDelegate = {
  shouldInterceptFormLinkClick(link: Element): boolean
  formLinkClickIntercepted(link: Element, form: HTMLFormElement): void
}

export class FormLinkInterceptor implements LinkInterceptorDelegate {
  readonly linkInterceptor: LinkInterceptor
  readonly delegate: FormLinkInterceptorDelegate

  constructor(delegate: FormLinkInterceptorDelegate, element: HTMLElement) {
    this.delegate = delegate
    this.linkInterceptor = new LinkInterceptor(this, element)
  }

  start() {
    this.linkInterceptor.start()
  }

  stop() {
    this.linkInterceptor.stop()
  }

  shouldInterceptLinkClick(link: Element): boolean {
    return (
      this.delegate.shouldInterceptFormLinkClick(link) &&
      (link.hasAttribute("data-turbo-method") || link.hasAttribute("data-turbo-stream"))
    )
  }

  linkClickIntercepted(link: Element, action: string): void {
    const form = document.createElement("form")
    form.setAttribute("data-turbo", "true")
    form.setAttribute("action", action)
    form.setAttribute("hidden", "")

    const method = link.getAttribute("data-turbo-method")
    if (method) form.setAttribute("method", method)

    const turboConfirm = link.getAttribute("data-turbo-confirm")
    if (turboConfirm) form.setAttribute("data-turbo-confirm", turboConfirm)

    const turboStream = link.getAttribute("data-turbo-stream")
    if (turboStream) form.setAttribute("data-turbo-stream", turboStream)

    this.delegate.formLinkClickIntercepted(link, form)

    document.body.appendChild(form)
    form.requestSubmit()
    form.remove()
  }
}
