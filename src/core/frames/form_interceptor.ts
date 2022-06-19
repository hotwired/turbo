export interface FormInterceptorDelegate {
  shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement): boolean
  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement): void
}

export class FormInterceptor {
  readonly delegate: FormInterceptorDelegate
  readonly element: Element

  constructor(delegate: FormInterceptorDelegate, element: Element) {
    this.delegate = delegate
    this.element = element
  }

  start() {
    this.element.addEventListener("submit", this.submitBubbled)
  }

  stop() {
    this.element.removeEventListener("submit", this.submitBubbled)
  }

  submitBubbled = <EventListener>((event: SubmitEvent) => {
    const form = event.target
    if (
      !event.defaultPrevented &&
      form instanceof HTMLFormElement &&
      form.closest("turbo-frame, html") == this.element
    ) {
      const submitter = event.submitter || undefined
      const method = submitter?.getAttribute("formmethod") || form.method

      if (method != "dialog" && this.delegate.shouldInterceptFormSubmission(form, submitter)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        this.delegate.formSubmissionIntercepted(form, submitter)
      }
    }
  })
}
