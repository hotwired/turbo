import { getAttribute } from "../util"

export interface FormSubmitObserverDelegate {
  willSubmitForm(form: HTMLFormElement, submitter?: HTMLElement): boolean
  formSubmitted(form: HTMLFormElement, submitter?: HTMLElement): void
}

export class FormSubmitObserver {
  readonly delegate: FormSubmitObserverDelegate
  readonly eventTarget: EventTarget
  started = false

  constructor(delegate: FormSubmitObserverDelegate, eventTarget: EventTarget) {
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start() {
    if (!this.started) {
      this.eventTarget.addEventListener("submit", this.submitCaptured, true)
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      this.eventTarget.removeEventListener("submit", this.submitCaptured, true)
      this.started = false
    }
  }

  submitCaptured = () => {
    this.eventTarget.removeEventListener("submit", this.submitBubbled, false)
    this.eventTarget.addEventListener("submit", this.submitBubbled, false)
  }

  submitBubbled = <EventListener>((event: SubmitEvent) => {
    if (!event.defaultPrevented) {
      const form = event.target instanceof HTMLFormElement ? event.target : undefined
      const submitter = event.submitter || undefined

      if (
        form &&
        submissionDoesNotDismissDialog(form, submitter) &&
        submissionDoesNotTargetIFrame(form, submitter) &&
        submissionDoesNotIntegrateWithUJS(form, submitter) &&
        this.delegate.willSubmitForm(form, submitter)
      ) {
        event.preventDefault()
        this.delegate.formSubmitted(form, submitter)
      }
    }
  })
}

function submissionDoesNotDismissDialog(form: HTMLFormElement, submitter?: HTMLElement): boolean {
  const method = submitter?.getAttribute("formmethod") || form.getAttribute("method")

  return method != "dialog"
}

function submissionDoesNotTargetIFrame(form: HTMLFormElement, submitter?: HTMLElement): boolean {
  const target = submitter?.getAttribute("formtarget") || form.target

  for (const element of document.getElementsByName(target)) {
    if (element instanceof HTMLIFrameElement) return false
  }

  return true
}

function submissionDoesNotIntegrateWithUJS(form: HTMLFormElement, submitter?: HTMLElement): boolean {
  const value = getAttribute("data-remote", submitter, form)
  const remote = /true/i.test(value || "")

  return !remote
}
