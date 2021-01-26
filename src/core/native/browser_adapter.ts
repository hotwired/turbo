import { Adapter } from "./adapter"
import { Locatable } from "../url"
import { ProgressBar } from "../drive/progress_bar"
import { SystemStatusCode, Visit, VisitOptions } from "../drive/visit"
import { Session } from "../session"
import { uuid } from "../../util"

export class BrowserAdapter implements Adapter {
  readonly session: Session
  readonly progressBar = new ProgressBar

  progressBarTimeout?: number

  constructor(session: Session) {
    this.session = session
  }

  visitProposedToLocation(location: Locatable, options?: Partial<VisitOptions>) {
    const restorationIdentifier = options?.restorationIdentifier || uuid()
    this.navigator.startVisit(location, restorationIdentifier, options)
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
    this.progressBar.setValue(1)
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

  // Private

  showProgressBarAfterDelay() {
    this.progressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay)
  }

  showProgressBar = () => {
    this.progressBar.show()
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
