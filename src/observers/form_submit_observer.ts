import { doesNotTargetIFrame } from "../util"

export interface FormSubmitObserverDelegate {
  willSubmitForm(form: HTMLFormElement, submitter?: HTMLElement): boolean
  formSubmitted(form: HTMLFormElement, submitter?: HTMLElement): void
}

export class FormSubmitObserver {
  started = false
  declare readonly delegate: FormSubmitObserverDelegate
  declare readonly eventTarget: EventTarget

  constructor(delegate: FormSubmitObserverDelegate, eventTarget: EventTarget) {
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start(): void {
    if (!this.started) {
      this.eventTarget.addEventListener("submit", this.submitCaptured, true)
      this.started = true
    }
  }

  stop(): void {
    if (this.started) {
      this.eventTarget.removeEventListener("submit", this.submitCaptured, true)
      this.started = false
    }
  }

  submitCaptured = () => {
    this.eventTarget.removeEventListener("submit", this.submitBubbled, false)
    this.eventTarget.addEventListener("submit", this.submitBubbled, false)
  }

  // Only ever registered for "submit" events.
  submitBubbled = ((event: SubmitEvent) => {
    if (!event.defaultPrevented) {
      const form = event.target instanceof HTMLFormElement ? event.target : undefined
      const submitter = event.submitter || undefined

      if (
        form &&
        submissionDoesNotDismissDialog(form, submitter) &&
        submissionDoesNotTargetIFrame(form, submitter) &&
        this.delegate.willSubmitForm(form, submitter)
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
        this.delegate.formSubmitted(form, submitter)
      }
    }
  }) as EventListener
}

function submissionDoesNotDismissDialog(form: HTMLFormElement, submitter?: HTMLElement): boolean {
  const method = submitter?.getAttribute("formmethod") || form.getAttribute("method")

  return method != "dialog"
}

function submissionDoesNotTargetIFrame(form: HTMLFormElement, submitter?: HTMLElement): boolean {
  const target = submitter?.getAttribute("formtarget") || form.getAttribute("target")

  return doesNotTargetIFrame(target)
}
