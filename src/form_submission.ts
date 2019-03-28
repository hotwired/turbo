import { FetchRequest, FetchMethod, fetchMethodFromString } from "./fetch_request"
import { FetchResponse } from "./fetch_response"
import { Location } from "./location"

export interface FormSubmissionDelegate {

}

export enum FormSubmissionState {
  initialized
}

export class FormSubmission {
  readonly formElement: HTMLFormElement
  readonly formData: FormData
  readonly fetchRequest: FetchRequest
  state = FormSubmissionState.initialized

  constructor(formElement: HTMLFormElement) {
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

  start() {
    if (this.state == FormSubmissionState.initialized) {

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

  }
}
