import { Adapter } from "./adapter"
import { ProgressBar } from "../drive/progress_bar"
import { SystemStatusCode, Visit, VisitOptions } from "../drive/visit"
import { FormSubmission } from "../drive/form_submission"
import { Session } from "../session"
import { uuid } from "../../util"

export class BrowserAdapter implements Adapter {
  readonly session: Session
  readonly progressBar = new ProgressBar

  visitProgressBarTimeout?: number
  formProgressBarTimeout?: number

  constructor(session: Session) {
    this.session = session
  }

  visitProposedToLocation(location: URL, options?: Partial<VisitOptions>) {
    this.navigator.startVisit(location, uuid(), options)
  }

  visitStarted(visit: Visit) {
    visit.issueRequest()
    visit.changeHistory()
    visit.goToSamePageAnchor()
    visit.loadCachedSnapshot()
  }

  visitRequestStarted(visit: Visit) {
    this.progressBar.setValue(0)
    if (visit.hasCachedSnapshot() || visit.action != "restore") {
      this.showVisitProgressBarAfterDelay()
    } else {
      this.showProgressBar()
    }
  }

  visitRequestCompleted(visit: Visit) {
    visit.loadResponse()
  }

  visitRequestFailedWithStatusCode(visit: Visit, statusCode: number) {
    switch (statusCode) {
      case SystemStatusCode.networkFailure:
      case SystemStatusCode.timeoutFailure:
      case SystemStatusCode.contentTypeMismatch:
        return this.reload()
      default:
        return visit.loadResponse()
    }
  }

  visitRequestFinished(visit: Visit) {
    this.progressBar.setValue(1)
    this.hideVisitProgressBar()
  }

  visitCompleted(visit: Visit) {

  }

  pageInvalidated() {
    this.reload()
  }

  visitFailed(visit: Visit) {

  }

  visitRendered(visit: Visit) {

  }

  formSubmissionStarted(formSubmission: FormSubmission) {
    this.progressBar.setValue(0)
    this.showFormProgressBarAfterDelay()
  }

  formSubmissionFinished(formSubmission: FormSubmission) {
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

  reload() {
    window.location.reload()
  }

  get navigator() {
    return this.session.navigator
  }
}
