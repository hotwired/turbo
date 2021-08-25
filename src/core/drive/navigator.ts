import { Action, isAction } from "../types"
import { FetchMethod } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { FormSubmission } from "./form_submission"
import { expandURL, getAnchor, getRequestURL, Locatable } from "../url"
import { Visit, VisitDelegate, VisitOptions } from "./visit"
import { PageSnapshot } from "./page_snapshot"

export type NavigatorDelegate = VisitDelegate & {
  allowsVisitingLocationWithAction(location: URL, action?: Action): boolean
  visitProposedToLocation(location: URL, options: Partial<VisitOptions>): void
  notifyApplicationAfterVisitingSamePageLocation(oldURL: URL, newURL: URL): void
}

export class Navigator {
  readonly delegate: NavigatorDelegate
  formSubmission?: FormSubmission
  currentVisit?: Visit

  constructor(delegate: NavigatorDelegate) {
    this.delegate = delegate
  }

  proposeVisit(location: URL, options: Partial<VisitOptions> = {}) {
    if (this.delegate.allowsVisitingLocationWithAction(location, options.action)) {
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

    if (this.formSubmission.isIdempotent) {
      this.proposeVisit(this.formSubmission.fetchRequest.url, { action: this.getActionForFormSubmission(this.formSubmission) })
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
    // Not all adapters implement formSubmissionStarted
    if (typeof this.adapter.formSubmissionStarted === 'function') {
      this.adapter.formSubmissionStarted(formSubmission)
    }
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
      if (fetchResponse.serverError) {
        await this.view.renderError(snapshot)
      } else {
        await this.view.renderPage(snapshot)
      }
      this.view.scrollToTop()
      this.view.clearSnapshotCache()
    }
  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {
    console.error(error)
  }

  formSubmissionFinished(formSubmission: FormSubmission) {
    // Not all adapters implement formSubmissionFinished
    if (typeof this.adapter.formSubmissionFinished === 'function') {
      this.adapter.formSubmissionFinished(formSubmission)
    }
  }

  // Visit delegate

  visitStarted(visit: Visit) {
    this.delegate.visitStarted(visit)
  }

  visitCompleted(visit: Visit) {
    this.delegate.visitCompleted(visit)
  }

  locationWithActionIsSamePage(location: URL, action?: Action): boolean {
    const anchor = getAnchor(location)
    const currentAnchor = getAnchor(this.view.lastRenderedLocation)
    const isRestorationToTop = action === 'restore' && typeof anchor === 'undefined'

    return action !== "replace" &&
      getRequestURL(location) === getRequestURL(this.view.lastRenderedLocation) &&
      (isRestorationToTop || (anchor != null && anchor !== currentAnchor))
  }

  visitScrolledToSamePageLocation(oldURL: URL, newURL: URL) {
    this.delegate.visitScrolledToSamePageLocation(oldURL, newURL)
  }

  // Visits

  get location() {
    return this.history.location
  }

  get restorationIdentifier() {
    return this.history.restorationIdentifier
  }

  getActionForFormSubmission(formSubmission: FormSubmission): Action {
    const { formElement, submitter } = formSubmission
    const action = submitter?.getAttribute("data-turbo-action") || formElement.getAttribute("data-turbo-action")
    return isAction(action) ? action : "advance"
  }
}
