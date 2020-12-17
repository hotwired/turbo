export interface FormInterceptorDelegate {
  shouldInterceptFormSubmission(element: HTMLFormElement): boolean
  formSubmissionIntercepted(element: HTMLFormElement): void
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

  submitBubbled = (event: Event) => {
    if (event.target instanceof HTMLFormElement) {
      const form = event.target
      if (this.delegate.shouldInterceptFormSubmission(form)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        this.delegate.formSubmissionIntercepted(form)
      }
    }
  }
}
