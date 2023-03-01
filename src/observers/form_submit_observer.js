import { HTMLFormSubmission } from "../core/drive/html_form_submission"

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
      const submission =
        event.target instanceof HTMLFormElement
          ? new HTMLFormSubmission(event.target, event.submitter || undefined)
          : undefined

      if (
        submission &&
        submissionDoesNotDismissDialog(submission) &&
        submissionDoesNotTargetIFrame(submission) &&
        this.delegate.willSubmitForm(submission)
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
        this.delegate.formSubmitted(submission)
      }
    }
  }
}

function submissionDoesNotDismissDialog(htmlFormSubmission) {
  return htmlFormSubmission.method != "dialog"
}

function submissionDoesNotTargetIFrame(htmlFormSubmission) {
  if (htmlFormSubmission.target) {
    for (const element of document.getElementsByName(htmlFormSubmission.target)) {
      if (element instanceof HTMLIFrameElement) return false
    }

    return true
  } else {
    return true
  }
}
