import { FetchRequest, FetchMethod, fetchMethodFromString } from "./fetch_request"
import { FetchResponse } from "./fetch_response"
import { Location } from "./location"

export interface FormSubmissionDelegate {
  formSubmissionStarted(formSubmission: FormSubmission): void
  formSubmissionProgressed(formSubmission: FormSubmission, progress: number): void
  formSubmissionWillRedirectToLocation(formSubmission: FormSubmission, location: Location): boolean
  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionErrored(formSubmission: FormSubmission, error: Error): void
  formSubmissionFinished(formSubmission: FormSubmission): void
}

export enum FormSubmissionState {
  initialized,
  started,
  stopping,
  stopped,
}

export class FormSubmission {
  readonly delegate: FormSubmissionDelegate
  readonly formElement: HTMLFormElement
  readonly formData: FormData
  readonly fetchRequest: FetchRequest
  state = FormSubmissionState.initialized

  constructor(delegate: FormSubmissionDelegate, formElement: HTMLFormElement) {
    this.delegate = delegate
    this.formElement = formElement
    this.formData = new FormData(formElement)
    this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body)
  }

  get method(): FetchMethod {
    return fetchMethodFromString(this.formElement.method.toLowerCase()) || FetchMethod.get
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
    const { initialized, started } = FormSubmissionState
    if (this.state == initialized) {
      this.state = started
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
    return {}
  }

  requestStarted(request: FetchRequest) {

  }

  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {

  }

  requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {

  }

  requestErrored(request: FetchRequest, error: Error) {

  }

  requestFinished(request: FetchRequest) {
    this.state = FormSubmissionState.stopped
  }
}
