import { Adapter } from "./adapter"
import { ProgressBar } from "../drive/progress_bar"
import { SystemStatusCode, Visit, VisitOptions } from "../drive/visit"
import { Session } from "../session"
import { uuid } from "../../util"
import { FormSubmission } from "../drive/form_submission"

export class BrowserAdapter implements Adapter {
  readonly session: Session
  readonly progressBar = new ProgressBar

  progressBarTimeout?: number

  constructor(session: Session) {
    this.session = session
  }

  visitProposedToLocation(location: URL, options?: Partial<VisitOptions>) {
    this.navigator.startVisit(location, uuid(), options)
  }

  visitStarted(visit: Visit) {
    visit.issueRequest()
    visit.changeHistory()
    visit.loadCachedSnapshot()
  }

  visitRequestStarted(visit: Visit) {
    this.progressBar.value = 0
    if (visit.hasCachedSnapshot() || visit.action != "restore") {
      this.showProgressBarAfterDelay()
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
    this.progressBar.value = 1.0
    this.hideProgressBar()
  }

  visitCompleted(visit: Visit) {
    visit.followRedirect()
  }

  pageInvalidated() {
    this.reload()
  }

  visitFailed(visit: Visit) {

  }

  visitRendered(visit: Visit) {

  }

  formSubmissionStarted(formSubmission: FormSubmission) {
    this.progressBar.value = 0
    this.showProgressBarAfterDelay()
  }

  formSubmissionFinished(formSubmission: FormSubmission) {
    this.progressBar.value = 1.0
    this.hideProgressBar()
  }

  // Private

  showProgressBarAfterDelay() {
    this.progressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay)
  }

  showProgressBar = () => {
    if (this.progressBar.value < 1.0) {
      this.progressBar.show()
    }
  }

  hideProgressBar() {
    this.progressBar.hide()
    if (this.progressBarTimeout != null) {
      window.clearTimeout(this.progressBarTimeout)
      delete this.progressBarTimeout
    }
  }

  reload() {
    window.location.reload()
  }

  get navigator() {
    return this.session.navigator
  }
}
