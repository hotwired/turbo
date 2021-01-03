import { elementIsNavigable } from "../core/session"

export interface FormSubmitObserverDelegate {
  willSubmitForm(form: HTMLFormElement, submitter?: HTMLElement): boolean
  formSubmitted(form: HTMLFormElement, submitter?: HTMLElement): void
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

  submitBubbled = <EventListener>((event: SubmitEvent) => {
    if (!event.defaultPrevented) {
      const form = event.target instanceof HTMLFormElement ? event.target : undefined
      const submitter = event.submitter || undefined

      if (form
          && elementIsNavigable(form)
          && elementIsNavigable(submitter)
          && !submissionControlsDialog(form, submitter)
          && !submissionTargetsIframe(form, submitter)
          && this.delegate.willSubmitForm(form, submitter)) {
        event.preventDefault()
        this.delegate.formSubmitted(form, submitter)
      }
    }
  })
}

function submissionControlsDialog(form: HTMLFormElement, submitter?: HTMLElement): boolean {
  const method = submitter?.getAttribute("formmethod") || form.method

  return method == "dialog"
}

function submissionTargetsIframe(form: HTMLFormElement, submitter?: HTMLElement): boolean {
  const target = submitter?.getAttribute("formtarget") || form.target

  return !!target && !!document.querySelector(`iframe[name="${target}"]`)
}
