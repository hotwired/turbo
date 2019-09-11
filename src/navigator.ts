import { FetchMethod } from "./fetch_request"
import { FetchResponse } from "./fetch_response"
import { FormSubmission } from "./form_submission"
import { Location } from "./location"
import { Action } from "./types"
import { Visit, VisitDelegate, VisitOptions, VisitResponse } from "./visit"

export type NavigatorDelegate = VisitDelegate & {
  allowsVisitingLocation(location: Location): boolean
  visitProposed(location: Location, action: Action): void
}

export class Navigator {
  readonly delegate: NavigatorDelegate
  formSubmission?: FormSubmission
  proposedResponse?: VisitResponse
  currentVisit?: Visit

  constructor(delegate: NavigatorDelegate) {
    this.delegate = delegate
  }

  proposeVisit(location: Location, options: Partial<VisitOptions> = {}) {
    if (this.delegate.allowsVisitingLocation(location)) {
      this.proposedResponse = options.response
      this.delegate.visitProposed(location, options.action || "advance")
    } else {
      delete this.proposedResponse
    }
  }

  startVisit(location: Location, restorationIdentifier: string, options: Partial<VisitOptions> = {}) {
    this.stop()
    this.currentVisit = new Visit(this, location, restorationIdentifier, {
      referrer: this.location,
      response: this.proposedResponse,
      ...options
    })
    delete this.proposedResponse
    this.currentVisit.start()
  }

  submitForm(form: HTMLFormElement) {
    this.stop()
    this.formSubmission = new FormSubmission(this, form, true)
    this.formSubmission.start()
  }

  stop() {
    if (this.formSubmission) {
      this.formSubmission.stop()
      delete this.formSubmission
    }

    if (this.currentVisit) {
      this.currentVisit.cancel()
      delete this.currentVisit
    }
  }

  reload() {

  }

  goBack() {

  }

  get adapter() {
    return this.delegate.adapter
  }

  get view() {
    return this.delegate.view
  }

  get history() {
    return this.delegate.history
  }

  // Form submission delegate

  formSubmissionStarted(formSubmission: FormSubmission) {

  }

  async formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {
    console.log("Form submission succeeded", formSubmission)
    if (formSubmission == this.formSubmission) {
      const responseHTML = await fetchResponse.responseHTML
      if (responseHTML) {
        if (formSubmission.method != FetchMethod.get) {
          console.log("Clearing snapshot cache after successful form submission")
          this.view.clearSnapshotCache()
        }

        const visitOptions = { response: { responseHTML } }
        console.log("Visiting", fetchResponse.location, visitOptions)
        this.proposeVisit(fetchResponse.location, visitOptions)
      }
    }
  }

  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {
    console.error("Form submission failed", formSubmission, fetchResponse)
  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {
    console.error("Form submission failed", formSubmission, error)
  }

  formSubmissionFinished(formSubmission: FormSubmission) {

  }

  // Visit delegate

  visitStarted(visit: Visit) {
    this.delegate.visitStarted(visit)
  }

  visitCompleted(visit: Visit) {
    this.delegate.visitCompleted(visit)
  }

  // Visits

  get location() {
    return this.history.location
  }
}
