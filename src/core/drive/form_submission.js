import { FetchRequest } from "../../http/fetch_request"
import { dispatch, getAttribute, getMetaContent, hasAttribute } from "../../util"
import { StreamMessage } from "../streams/stream_message"

export const FormSubmissionState = {
  initialized: "initialized",
  requesting: "requesting",
  waiting: "waiting",
  receiving: "receiving",
  stopping: "stopping",
  stopped: "stopped"
}

export class FormSubmission {
  state = FormSubmissionState.initialized

  static confirmMethod(message, _element, _submitter) {
    return Promise.resolve(confirm(message))
  }

  constructor(delegate, submission, mustRedirect = false) {
    this.delegate = delegate
    this.submission = submission
    this.formElement = submission.form
    this.submitter = submission.submitter
    this.formData = submission.formData
    this.location = submission.location
    this.method = submission.fetchMethod
    this.action = submission.action
    this.body = submission.body
    this.enctype = submission.enctype
    this.visitAction = submission.visitAction
    this.frame = submission.frame
    this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body, this.formElement)
    this.mustRedirect = mustRedirect
  }

  get isSafe() {
    return this.fetchRequest.isSafe
  }

  // The submission process

  async start() {
    const { initialized, requesting } = FormSubmissionState
    const confirmationMessage = getAttribute("data-turbo-confirm", this.submitter, this.formElement)

    if (typeof confirmationMessage === "string") {
      const answer = await FormSubmission.confirmMethod(confirmationMessage, this.formElement, this.submitter)
      if (!answer) {
        return
      }
    }

    if (this.state == initialized) {
      this.state = requesting
      return this.fetchRequest.perform()
    }
  }

  stop() {
    const { stopping, stopped } = FormSubmissionState
    if (this.state != stopping && this.state != stopped) {
      this.state = stopping
      this.fetchRequest.cancel()
      return true
    }
  }

  // Fetch request delegate

  prepareRequest(request) {
    if (!request.isSafe) {
      const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token")
      if (token) {
        request.headers["X-CSRF-Token"] = token
      }
    }

    if (this.requestAcceptsTurboStreamResponse(request)) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted(_request) {
    this.state = FormSubmissionState.waiting
    this.submitter?.setAttribute("disabled", "")
    this.setSubmitsWith()
    dispatch("turbo:submit-start", {
      target: this.formElement,
      detail: { formSubmission: this }
    })
    this.delegate.formSubmissionStarted(this)
  }

  requestPreventedHandlingResponse(request, response) {
    this.result = { success: response.succeeded, fetchResponse: response }
  }

  requestSucceededWithResponse(request, response) {
    if (response.clientError || response.serverError) {
      this.delegate.formSubmissionFailedWithResponse(this, response)
    } else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
      const error = new Error("Form responses must redirect to another location")
      this.delegate.formSubmissionErrored(this, error)
    } else {
      this.state = FormSubmissionState.receiving
      this.result = { success: true, fetchResponse: response }
      this.delegate.formSubmissionSucceededWithResponse(this, response)
    }
  }

  requestFailedWithResponse(request, response) {
    this.result = { success: false, fetchResponse: response }
    this.delegate.formSubmissionFailedWithResponse(this, response)
  }

  requestErrored(request, error) {
    this.result = { success: false, error }
    this.delegate.formSubmissionErrored(this, error)
  }

  requestFinished(_request) {
    this.state = FormSubmissionState.stopped
    this.submitter?.removeAttribute("disabled")
    this.resetSubmitterText()
    dispatch("turbo:submit-end", {
      target: this.formElement,
      detail: { formSubmission: this, ...this.result }
    })
    this.delegate.formSubmissionFinished(this)
  }

  // Private

  setSubmitsWith() {
    if (!this.submitter || !this.submitsWith) return

    if (this.submitter.matches("button")) {
      this.originalSubmitText = this.submitter.innerHTML
      this.submitter.innerHTML = this.submitsWith
    } else if (this.submitter.matches("input")) {
      const input = this.submitter
      this.originalSubmitText = input.value
      input.value = this.submitsWith
    }
  }

  resetSubmitterText() {
    if (!this.submitter || !this.originalSubmitText) return

    if (this.submitter.matches("button")) {
      this.submitter.innerHTML = this.originalSubmitText
    } else if (this.submitter.matches("input")) {
      const input = this.submitter
      input.value = this.originalSubmitText
    }
  }

  requestMustRedirect(request) {
    return !request.isSafe && this.mustRedirect
  }

  requestAcceptsTurboStreamResponse(request) {
    return !request.isSafe || hasAttribute("data-turbo-stream", this.submitter, this.formElement)
  }

  get submitsWith() {
    return this.submitter?.getAttribute("data-turbo-submits-with")
  }
}

function getCookieValue(cookieName) {
  if (cookieName != null) {
    const cookies = document.cookie ? document.cookie.split("; ") : []
    const cookie = cookies.find((cookie) => cookie.startsWith(cookieName))
    if (cookie) {
      const value = cookie.split("=").slice(1).join("=")
      return value ? decodeURIComponent(value) : undefined
    }
  }
}

function responseSucceededWithoutRedirect(response) {
  return response.statusCode == 200 && !response.redirected
}
