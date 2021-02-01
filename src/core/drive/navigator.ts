import { FetchMethod } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { FormSubmission } from "./form_submission"
import { expandURL, Locatable } from "../url"
import { Visit, VisitDelegate, VisitOptions } from "./visit"
import { PageSnapshot } from "./page_snapshot"

export type NavigatorDelegate = VisitDelegate & {
  allowsVisitingLocation(location: URL): boolean
  visitProposedToLocation(location: URL, options: Partial<VisitOptions>): void
}

export class Navigator {
  readonly delegate: NavigatorDelegate
  formSubmission?: FormSubmission
  currentVisit?: Visit

  constructor(delegate: NavigatorDelegate) {
    this.delegate = delegate
  }

  proposeVisit(location: URL, options: Partial<VisitOptions> = {}) {
    if (this.delegate.allowsVisitingLocation(location)) {
      this.delegate.visitProposedToLocation(location, options)
    }
  }

  startVisit(locatable: Locatable, restorationIdentifier: string, options: Partial<VisitOptions> = {}) {
    this.stop()
    this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, {
      referrer: this.location,
      ...options
    })
    this.currentVisit.start()
  }

  submitForm(form: HTMLFormElement, submitter?: HTMLElement) {
    this.stop()
    this.formSubmission = new FormSubmission(this, form, submitter, true)

    if (this.formSubmission.fetchRequest.isIdempotent) {
      this.proposeVisit(this.formSubmission.fetchRequest.url)
    } else {
      this.formSubmission.start()
    }
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
    if (formSubmission == this.formSubmission) {
      const responseHTML = await fetchResponse.responseHTML
      if (responseHTML) {
        if (formSubmission.method != FetchMethod.get) {
          this.view.clearSnapshotCache()
        }

        const { statusCode } = fetchResponse
        const visitOptions = { response: { statusCode, responseHTML } }
        this.proposeVisit(fetchResponse.location, visitOptions)
      }
    }
  }

  async formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {
    const responseHTML = await fetchResponse.responseHTML

    if (responseHTML) {
      const snapshot = PageSnapshot.fromHTMLString(responseHTML)
      await this.view.renderPage(snapshot)
      this.view.clearSnapshotCache()
    }
  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {

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

  get restorationIdentifier() {
    return this.history.restorationIdentifier
  }
}
