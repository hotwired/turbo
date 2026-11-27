import { ProgressBar } from "../drive/progress_bar"
import { SystemStatusCode, VisitState, type Visit, type VisitOptions } from "../drive/visit"
import { uuid, dispatch } from "../../util"
import { locationIsVisitable } from "../url"
import type { Adapter } from "./adapter"
import type { FormSubmission } from "../drive/form_submission"
import type { Navigator } from "../drive/navigator"
import type { ReloadReason, StructuredReason } from "../types"

export type { ReloadReason } from "../types"

export interface BrowserAdapterSession {
  readonly navigator: Navigator
  readonly progressBarDelay: number
}

export class BrowserAdapter implements Adapter {
  readonly progressBar = new ProgressBar()
  declare readonly session: BrowserAdapterSession
  declare location?: URL
  declare redirectedToLocation?: URL | null
  declare visitProgressBarTimeout?: number
  declare formProgressBarTimeout?: number

  constructor(session: BrowserAdapterSession) {
    this.session = session
  }

  visitProposedToLocation(location: URL, options?: Partial<VisitOptions>): void {
    if (locationIsVisitable(location, this.navigator.rootLocation)) {
      this.navigator.startVisit(location, options?.restorationIdentifier || uuid(), options)
    } else {
      window.location.href = location.toString()
    }
  }

  visitStarted(visit: Visit): void {
    this.location = visit.location
    this.redirectedToLocation = null

    visit.loadCachedSnapshot()
    visit.issueRequest()
  }

  visitRequestStarted(visit: Visit): void {
    this.progressBar.setValue(0)
    if (visit.hasCachedSnapshot() || visit.action != "restore") {
      this.showVisitProgressBarAfterDelay(visit)
    } else {
      this.showProgressBar()
    }
  }

  visitRequestCompleted(visit: Visit): void {
    visit.loadResponse()

    if (visit.response!.redirected) {
      this.redirectedToLocation = visit.redirectedToLocation
    }
  }

  visitRequestFailedWithStatusCode(visit: Visit, statusCode: number): void {
    switch (statusCode) {
      case SystemStatusCode.networkFailure:
      case SystemStatusCode.timeoutFailure:
      case SystemStatusCode.contentTypeMismatch:
        this.reload({
          reason: "request_failed",
          context: {
            statusCode
          }
        })
        return visit.fail()
      default:
        return visit.loadResponse()
    }
  }

  visitRequestFinished(_visit: Visit): void {}

  visitCompleted(_visit: Visit): void {
    this.progressBar.setValue(1)
    this.hideVisitProgressBar()
  }

  pageInvalidated(reason: ReloadReason): void {
    this.reload(reason)
  }

  visitFailed(_visit: Visit): void {
    this.progressBar.setValue(1)
    this.hideVisitProgressBar()
  }

  visitRendered(_visit: Visit): void {}

  // Link prefetching

  linkPrefetchingIsEnabledForLocation(_location: URL): boolean {
    return true
  }

  // Form Submission Delegate

  formSubmissionStarted(_formSubmission: FormSubmission): void {
    this.progressBar.setValue(0)
    this.showFormProgressBarAfterDelay()
  }

  formSubmissionFinished(_formSubmission: FormSubmission): void {
    this.progressBar.setValue(1)
    this.hideFormProgressBar()
  }

  // Private

  showVisitProgressBarAfterDelay(visit: Visit): void {
    this.visitProgressBarTimeout = window.setTimeout(() => {
      if (visit.state == VisitState.started) this.showProgressBar()
    }, this.session.progressBarDelay)
  }

  hideVisitProgressBar(): void {
    this.progressBar.hide()
    if (this.visitProgressBarTimeout != null) {
      window.clearTimeout(this.visitProgressBarTimeout)
      delete this.visitProgressBarTimeout
    }
  }

  showFormProgressBarAfterDelay(): void {
    if (this.formProgressBarTimeout == null) {
      this.formProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay)
    }
  }

  hideFormProgressBar(): void {
    this.progressBar.hide()
    if (this.formProgressBarTimeout != null) {
      window.clearTimeout(this.formProgressBarTimeout)
      delete this.formProgressBarTimeout
    }
  }

  showProgressBar = () => {
    this.progressBar.show()
  }

  reload(reason: ReloadReason): void {
    // CustomEvent delivers an undefined detail as null.
    dispatch("turbo:reload", { detail: reason as StructuredReason | null })

    const location = reason?.context?.location || this.redirectedToLocation || this.location
    window.location.href = location?.toString() || window.location.href
  }

  get navigator(): Navigator {
    return this.session.navigator
  }
}
