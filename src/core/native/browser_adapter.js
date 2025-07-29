import { ProgressBar } from "../drive/progress_bar"
import { SystemStatusCode } from "../drive/visit"
import { uuid, dispatch } from "../../util"
import { locationIsVisitable } from "../url"

export class BrowserAdapter {
  progressBar = new ProgressBar()

  constructor(session) {
    this.session = session
  }

  visitProposedToLocation(location, options) {
    if (locationIsVisitable(location, this.navigator.rootLocation)) {
      this.navigator.startVisit(location, options?.restorationIdentifier || uuid(), options)
    } else {
      window.location.href = location.toString()
    }
  }

  visitStarted(visit) {
    this.location = visit.location
    visit.loadCachedSnapshot()
    visit.issueRequest()
    visit.goToSamePageAnchor()
  }

  visitRequestStarted(visit) {
    this.progressBar.setValue(0)
    if (visit.hasCachedSnapshot() || visit.action != "restore") {
      this.showVisitProgressBarAfterDelay()
    } else {
      this.showProgressBar()
    }
  }

  visitRequestCompleted(visit) {
    visit.loadResponse()

    if(visit.response.redirected) {
      this.location = visit.redirectedToLocation
    }
  }

  visitRequestFailedWithStatusCode(visit, statusCode) {
    switch (statusCode) {
      case SystemStatusCode.networkFailure:
      case SystemStatusCode.timeoutFailure:
      case SystemStatusCode.contentTypeMismatch:
        return this.reload({
          reason: "request_failed",
          context: {
            statusCode
          }
        })
      default:
        return visit.loadResponse()
    }
  }

  visitRequestFinished(_visit) {}

  visitCompleted(_visit) {
    this.progressBar.setValue(1)
    this.hideVisitProgressBar()
  }

  pageInvalidated(reason) {
    this.reload(reason)
  }

  visitFailed(_visit) {
    this.progressBar.setValue(1)
    this.hideVisitProgressBar()
  }

  visitRendered(_visit) {}

  // Link prefetching

  linkPrefetchingIsEnabledForLocation(location) {
    return true
  }

  // Form Submission Delegate

  formSubmissionStarted(_formSubmission) {
    this.progressBar.setValue(0)
    this.showFormProgressBarAfterDelay()
  }

  formSubmissionFinished(_formSubmission) {
    this.progressBar.setValue(1)
    this.hideFormProgressBar()
  }

  // Private

  showVisitProgressBarAfterDelay() {
    this.visitProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay)
  }

  hideVisitProgressBar() {
    this.progressBar.hide()
    if (this.visitProgressBarTimeout != null) {
      window.clearTimeout(this.visitProgressBarTimeout)
      delete this.visitProgressBarTimeout
    }
  }

  showFormProgressBarAfterDelay() {
    if (this.formProgressBarTimeout == null) {
      this.formProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay)
    }
  }

  hideFormProgressBar() {
    this.progressBar.hide()
    if (this.formProgressBarTimeout != null) {
      window.clearTimeout(this.formProgressBarTimeout)
      delete this.formProgressBarTimeout
    }
  }

  showProgressBar = () => {
    this.progressBar.show()
  }

  reload(reason) {
    dispatch("turbo:reload", { detail: reason })

    window.location.href = this.location?.toString() || window.location.href
  }

  get navigator() {
    return this.session.navigator
  }
}
