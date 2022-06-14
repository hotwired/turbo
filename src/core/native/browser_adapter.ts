import { Adapter } from "./adapter"
import { ProgressBar } from "../drive/progress_bar"
import { SystemStatusCode, Visit, VisitOptions } from "../drive/visit"
import { FormSubmission } from "../drive/form_submission"
import { Session } from "../session"
import { uuid, dispatch } from "../../util"

export type ReloadReason = StructuredReason | undefined
interface StructuredReason {
  reason: string
  context?: { [key: string]: any }
}

export class BrowserAdapter implements Adapter {
  readonly session: Session
  readonly progressBar = new ProgressBar()

  visitProgressBarTimeout?: number
  formProgressBarTimeout?: number
  location?: URL

  constructor(session: Session) {
    this.session = session
  }

  visitProposedToLocation(location: URL, options?: Partial<VisitOptions>) {
    this.navigator.startVisit(location, uuid(), options)
  }

  visitStarted(visit: Visit) {
    this.location = visit.location
    visit.loadCachedSnapshot()
    visit.issueRequest()
    visit.goToSamePageAnchor()
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
        return this.reload({
          reason: "request_failed",
          context: {
            statusCode,
          },
        })
      default:
        return visit.loadResponse()
    }
  }

  visitRequestFinished(_visit: Visit) {
    this.progressBar.setValue(1)
    this.hideVisitProgressBar()
  }

  visitCompleted(_visit: Visit) {}

  pageInvalidated(reason: ReloadReason) {
    this.reload(reason)
  }

  visitFailed(_visit: Visit) {}

  visitRendered(_visit: Visit) {}

  formSubmissionStarted(_formSubmission: FormSubmission) {
    this.progressBar.setValue(0)
    this.showFormProgressBarAfterDelay()
  }

  formSubmissionFinished(_formSubmission: FormSubmission) {
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

  reload(reason: ReloadReason) {
    dispatch("turbo:reload", { detail: reason })

    if (!this.location) return

    window.location.href = this.location.toString()
  }

  get navigator() {
    return this.session.navigator
  }
}
