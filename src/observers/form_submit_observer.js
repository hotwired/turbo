import { doesNotTargetIFrame } from "../util"

export class FormSubmitObserver {
  started = false

  constructor(delegate, eventTarget) {
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

  submitBubbled = (event) => {
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
  }
}

function submissionDoesNotDismissDialog(form, submitter) {
  const method = submitter?.getAttribute("formmethod") || form.getAttribute("method")

  return method != "dialog"
}

function submissionDoesNotTargetIFrame(form, submitter) {
  const target = submitter?.getAttribute("formtarget") || form.getAttribute("target")

  return doesNotTargetIFrame(target)
}
