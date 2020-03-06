import { FetchRequest, FetchMethod, fetchMethodFromString, FetchRequestHeaders } from "./fetch_request"
import { FetchResponse } from "./fetch_response"
import { Location } from "./location"
import { dispatch } from "./util"

export interface FormSubmissionDelegate {
  formSubmissionStarted(formSubmission: FormSubmission): void
  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionErrored(formSubmission: FormSubmission, error: Error): void
  formSubmissionFinished(formSubmission: FormSubmission): void
}

export type FormSubmissionResult
  = { success: boolean, response: FetchResponse }
  | { success: false, error: Error }

export enum FormSubmissionState {
  initialized,
  requesting,
  waiting,
  receiving,
  stopping,
  stopped,
}

export class FormSubmission {
  readonly delegate: FormSubmissionDelegate
  readonly formElement: HTMLFormElement
  readonly formData: FormData
  readonly fetchRequest: FetchRequest
  readonly mustRedirect: boolean
  state = FormSubmissionState.initialized
  result?: FormSubmissionResult

  constructor(delegate: FormSubmissionDelegate, formElement: HTMLFormElement, mustRedirect = false) {
    this.delegate = delegate
    this.formElement = formElement
    this.formData = new FormData(formElement)
    this.fetchRequest = new FetchRequest(this, this.method, this.location, this.formData)
    this.mustRedirect = mustRedirect
  }

  get method(): FetchMethod {
    const method = this.formElement.getAttribute("method") || ""
    return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get
  }

  get location() {
    return Location.wrap(this.formElement.action)
  }

  // The submission process

  async start() {
    const { initialized, requesting } = FormSubmissionState
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

  additionalHeadersForRequest(request: FetchRequest) {
    const headers: FetchRequestHeaders = {}
    if (this.method != FetchMethod.get) {
      const token = getMetaContent("csrf-token")
      if (token) {
        headers["X-CSRF-Token"] = token
      }
    }
    return headers
  }

  requestStarted(request: FetchRequest) {
    this.state = FormSubmissionState.waiting
    dispatch("turbolinks:submit-start", { target: this.formElement, data: { formSubmission: this } })
    this.delegate.formSubmissionStarted(this)
  }

  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {
    if (this.requestMustRedirect(request) && !response.redirected) {
      const error = new Error("Form responses must redirect to another location")
      this.delegate.formSubmissionErrored(this, error)
    } else {
      this.state = FormSubmissionState.receiving
      this.result = { success: true, response }
      this.delegate.formSubmissionSucceededWithResponse(this, response)
    }
  }

  requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    this.result = { success: false, response }
    this.delegate.formSubmissionFailedWithResponse(this, response)
  }

  requestErrored(request: FetchRequest, error: Error) {
    this.result = { success: false, error }
    this.delegate.formSubmissionErrored(this, error)
  }

  requestFinished(request: FetchRequest) {
    this.state = FormSubmissionState.stopped
    dispatch("turbolinks:submit-end", { target: this.formElement, data: { formSubmission: this, ...this.result }})
    this.delegate.formSubmissionFinished(this)
  }

  requestMustRedirect(request: FetchRequest) {
    return !request.isIdempotent && this.mustRedirect
  }
}

function getMetaContent(name: string) {
  const element: HTMLMetaElement | null = document.querySelector(`meta[name="${name}"]`)
  return element && element.content
}
