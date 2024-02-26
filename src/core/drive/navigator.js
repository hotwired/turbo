import { getVisitAction, getVisitReplaceMethod } from "../../util"
import { FormSubmission } from "./form_submission"
import { expandURL, getAnchor, getRequestURL } from "../url"
import { Visit } from "./visit"
import { PageSnapshot } from "./page_snapshot"

export class Navigator {
  constructor(delegate) {
    this.delegate = delegate
  }

  proposeVisit(location, options = {}) {
    console.log(`proposeVisit ${location}`, options)
    if (this.delegate.allowsVisitingLocationWithAction(location, options.action)) {
      this.delegate.visitProposedToLocation(location, options)
    }
  }

  startVisit(locatable, restorationIdentifier, options = {}) {
    this.stop()
    this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, {
      referrer: this.location,
      ...options
    })
    this.currentVisit.start()
  }

  submitForm(form, submitter) {
    this.stop()
    this.formSubmission = new FormSubmission(this, form, submitter, true)

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

  get adapter() {
    return this.delegate.adapter
  }

  get view() {
    return this.delegate.view
  }

  get rootLocation() {
    return this.view.snapshot.rootLocation
  }

  get history() {
    return this.delegate.history
  }

  // Form submission delegate

  formSubmissionStarted(formSubmission) {
    // Not all adapters implement formSubmissionStarted
    if (typeof this.adapter.formSubmissionStarted === "function") {
      this.adapter.formSubmissionStarted(formSubmission)
    }
  }

  async formSubmissionSucceededWithResponse(formSubmission, fetchResponse) {
    console.log(`formSubmissionSucceededWithResponse`)
    if (formSubmission == this.formSubmission) {
      const responseHTML = await fetchResponse.responseHTML
      if (responseHTML) {
        const shouldCacheSnapshot = formSubmission.isSafe
        if (!shouldCacheSnapshot) {
          this.view.clearSnapshotCache()
        }

        const { statusCode, redirected } = fetchResponse
        const action = this.#getActionForFormSubmission(formSubmission, fetchResponse)
        const replaceMethod = this.#getReplaceMethodForFormSubmission(formSubmission, fetchResponse)
        console.log(`action = ${action} and replaceMethod = ${replaceMethod}`)
        const visitOptions = {
          action,
          replaceMethod,
          shouldCacheSnapshot,
          response: { statusCode, responseHTML, redirected }
        }
        console.log(`calling proposeVisit from formSubmission`)
        this.proposeVisit(fetchResponse.location, visitOptions)
      }
    }
  }

  async formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
    const responseHTML = await fetchResponse.responseHTML

    if (responseHTML) {
      const snapshot = PageSnapshot.fromHTMLString(responseHTML)
      if (fetchResponse.serverError) {
        await this.view.renderError(snapshot, this.currentVisit)
      } else {
        await this.view.renderPage(snapshot, false, true, this.currentVisit)
      }
      if(!snapshot.shouldPreserveScrollPosition) {
        this.view.scrollToTop()
      }
      this.view.clearSnapshotCache()
    }
  }

  formSubmissionErrored(formSubmission, error) {
    console.error(error)
  }

  formSubmissionFinished(formSubmission) {
    // Not all adapters implement formSubmissionFinished
    if (typeof this.adapter.formSubmissionFinished === "function") {
      this.adapter.formSubmissionFinished(formSubmission)
    }
  }

  // Visit delegate

  visitStarted(visit) {
    this.delegate.visitStarted(visit)
  }

  visitCompleted(visit) {
    this.delegate.visitCompleted(visit)
  }

  locationWithActionIsSamePage(location, action) {
    const anchor = getAnchor(location)
    const currentAnchor = getAnchor(this.view.lastRenderedLocation)
    const isRestorationToTop = action === "restore" && typeof anchor === "undefined"

    return (
      action !== "replace" &&
      getRequestURL(location) === getRequestURL(this.view.lastRenderedLocation) &&
      (isRestorationToTop || (anchor != null && anchor !== currentAnchor))
    )
  }

  visitScrolledToSamePageLocation(oldURL, newURL) {
    this.delegate.visitScrolledToSamePageLocation(oldURL, newURL)
  }

  // Visits

  get location() {
    return this.history.location
  }

  get restorationIdentifier() {
    return this.history.restorationIdentifier
  }

  #getActionForFormSubmission(formSubmission, fetchResponse) {
    const { submitter, formElement } = formSubmission
    return getVisitAction(submitter, formElement) || this.#getDefaultAction(fetchResponse)
  }

  #getDefaultAction(fetchResponse) {
    const sameLocationRedirect = fetchResponse.redirected && fetchResponse.location.href === this.location?.href
    return sameLocationRedirect ? "replace" : "advance"
  }

  #getReplaceMethodForFormSubmission(formSubmission, fetchResponse) {
    if (this.#getActionForFormSubmission(formSubmission, fetchResponse) !== "replace") return
    const { submitter, formElement } = formSubmission
    return getVisitReplaceMethod(submitter, formElement) || "body"
  }
}
