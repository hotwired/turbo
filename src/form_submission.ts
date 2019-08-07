import { FetchRequest, FetchMethod, fetchMethodFromString } from "./fetch_request"
import { FetchResponse } from "./fetch_response"
import { Location } from "./location"

export interface FormSubmissionDelegate {
  formSubmissionStarted(formSubmission: FormSubmission): void
  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionErrored(formSubmission: FormSubmission, error: Error): void
  formSubmissionFinished(formSubmission: FormSubmission): void
}

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

  constructor(delegate: FormSubmissionDelegate, formElement: HTMLFormElement, mustRedirect = false) {
    this.delegate = delegate
    this.formElement = formElement
    this.formData = new FormData(formElement)
    this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body)
    this.mustRedirect = mustRedirect
  }

  get method(): FetchMethod {
    const method = this.formElement.getAttribute("method") || ""
    return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get
  }

  get location() {
    return Location.wrap(this.formElement.action)
  }

  get params() {
    return this.entries.reduce((params, [name, value]) => {
      params.append(name, value.toString())
      return params
    }, new URLSearchParams)
  }

  get body() {
    if (this.method != FetchMethod.get) {
      return this.formData
    }
  }

  get entries() {
    return Array.from(this.formData.entries())
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
      this.fetchRequest.abort()
      return true
    }
  }

  // Fetch request delegate

  additionalHeadersForRequest(request: FetchRequest) {
    // TODO: Send CSRF tokens
    return {}
  }

  requestStarted(request: FetchRequest) {
    this.state = FormSubmissionState.waiting
    this.delegate.formSubmissionStarted(this)
  }

  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {
    if (response.redirected || !this.mustRedirect) {
      this.state = FormSubmissionState.receiving
      this.delegate.formSubmissionSucceededWithResponse(this, response)
    } else {
      const error = new Error("Form responses must redirect to another location")
      this.delegate.formSubmissionErrored(this, error)
    }
  }

  requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    this.delegate.formSubmissionFailedWithResponse(this, response)
  }

  requestErrored(request: FetchRequest, error: Error) {
    this.delegate.formSubmissionErrored(this, error)
  }

  requestFinished(request: FetchRequest) {
    this.state = FormSubmissionState.stopped
    this.delegate.formSubmissionFinished(this)
  }
}
