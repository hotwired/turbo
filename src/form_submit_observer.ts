export interface FormSubmitObserverDelegate {
  willSubmitForm(form: HTMLFormElement): boolean
  formSubmitted(form: HTMLFormElement): void
}

export class FormSubmitObserver {
  readonly delegate: FormSubmitObserverDelegate
  started = false

  constructor(delegate: FormSubmitObserverDelegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      addEventListener("submit", this.submitCaptured, true)
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      removeEventListener("submit", this.submitCaptured, true)
      this.started = false
    }
  }

  submitCaptured = () => {
    removeEventListener("submit", this.submitBubbled, false)
    addEventListener("submit", this.submitBubbled, false)
  }

  submitBubbled = (event: Event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : undefined
    if (form) {
      if (this.delegate.willSubmitForm(form)) {
        event.preventDefault()
        this.delegate.formSubmitted(form)
      }
    }
  }
}
