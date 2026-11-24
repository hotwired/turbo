import { getVisitAction } from "../../util"
import { FormSubmission, FormSubmissionState, type FormSubmissionDelegate } from "./form_submission"
import { expandURL, type Locatable } from "../url"
import { Visit, type VisitDelegate, type VisitOptions } from "./visit"
import { PageSnapshot } from "./page_snapshot"
import { ViewTransitioner } from "./view_transitioner"
import type { Action } from "../types"
import type { Adapter } from "../native/adapter"
import type { History } from "./history"
import type { PageView } from "./page_view"
import type { FetchResponse } from "../../http/fetch_response"

export interface NavigatorDelegate {
  readonly adapter: Adapter
  readonly view: PageView
  readonly history: History

  allowsVisitingLocationWithAction(location: URL, action?: Action): boolean
  visitProposedToLocation(location: URL, options: Partial<VisitOptions>): void
  visitStarted(visit: Visit): void
  visitCompleted(visit: Visit): void
}

export class Navigator implements VisitDelegate, FormSubmissionDelegate {
  declare readonly delegate: NavigatorDelegate
  declare formSubmission?: FormSubmission
  declare currentVisit?: Visit

  constructor(delegate: NavigatorDelegate) {
    this.delegate = delegate
  }

  proposeVisit(location: URL, options: Partial<VisitOptions> = {}): void {
    if (this.delegate.allowsVisitingLocationWithAction(location, options.action)) {
      this.delegate.visitProposedToLocation(location, options)
    }
  }

  startVisit(locatable: Locatable, restorationIdentifier?: string, options: Partial<VisitOptions> = {}): void {
    this.stop()
    this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, {
      referrer: this.location,
      ...options
    })
    this.currentVisit.start()
  }

  submitForm(form: HTMLFormElement, submitter?: HTMLElement): void {
    this.stop()
    this.formSubmission = new FormSubmission(this, form, submitter, true)

    this.formSubmission.start()
  }

  stop(): void {
    if (this.formSubmission) {
      this.formSubmission.stop()
      delete this.formSubmission
    }

    if (this.currentVisit) {
      this.currentVisit.cancel()
      delete this.currentVisit
    }
  }

  get adapter(): Adapter {
    return this.delegate.adapter
  }

  get view(): PageView {
    return this.delegate.view
  }

  get rootLocation(): URL {
    return this.view.snapshot.rootLocation
  }

  get history(): History {
    return this.delegate.history
  }

  get isFormSubmissionInFlight(): boolean {
    const state = this.formSubmission?.state
    const { requesting, waiting, receiving } = FormSubmissionState
    return state === requesting || state === waiting || state === receiving
  }

  // Form submission delegate

  formSubmissionStarted(formSubmission: FormSubmission): void {
    // Not all adapters implement formSubmissionStarted
    if (typeof this.adapter.formSubmissionStarted === "function") {
      this.adapter.formSubmissionStarted(formSubmission)
    }
  }

  async formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): Promise<void> {
    if (formSubmission == this.formSubmission) {
      const responseHTML = await fetchResponse.responseHTML
      if (responseHTML) {
        const shouldCacheSnapshot = formSubmission.isSafe
        if (!shouldCacheSnapshot) {
          this.view.clearSnapshotCache()
        }

        const { statusCode, redirected } = fetchResponse
        const action = this.#getActionForFormSubmission(formSubmission, fetchResponse)
        const visitOptions: Partial<VisitOptions> = {
          action,
          shouldCacheSnapshot,
          response: { statusCode, responseHTML, redirected }
        }
        this.proposeVisit(fetchResponse.location, visitOptions)
      }
    }
  }

  formSubmissionSucceededWithStreamResponse(_formSubmission: FormSubmission, _fetchResponse: FetchResponse): void {
    this.view.clearSnapshotCache()
  }

  async formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): Promise<void> {
    const responseHTML = await fetchResponse.responseHTML

    if (responseHTML) {
      const snapshot = PageSnapshot.fromHTMLString(responseHTML)
      await new ViewTransitioner().renderChange(
        this.view.shouldTransitionTo(snapshot),
        async () => {
          if (this.#shouldRenderError(snapshot, fetchResponse)) {
            await this.view.renderError(snapshot, this.currentVisit)
          } else {
            const reloadLocation = formSubmission.isSafe ? fetchResponse.location : undefined
            await this.view.renderPage(snapshot, false, true, this.currentVisit, reloadLocation)
          }
          if (snapshot.refreshScroll !== "preserve") {
            this.view.scrollToTop()
          }
        }
      )
      this.view.clearSnapshotCache()
    }
  }

  formSubmissionErrored(_formSubmission: FormSubmission, error: Error): void {
    console.error(error)
  }

  formSubmissionFinished(formSubmission: FormSubmission): void {
    // Not all adapters implement formSubmissionFinished
    if (typeof this.adapter.formSubmissionFinished === "function") {
      this.adapter.formSubmissionFinished(formSubmission)
    }
  }

  // Link prefetching

  linkPrefetchingIsEnabledForLocation(location: URL): boolean {
    // Not all adapters implement linkPrefetchingIsEnabledForLocation
    if (typeof this.adapter.linkPrefetchingIsEnabledForLocation === "function") {
      return this.adapter.linkPrefetchingIsEnabledForLocation(location)
    }

    return true
  }

  // Visit delegate

  visitStarted(visit: Visit): void {
    this.delegate.visitStarted(visit)
  }

  visitCompleted(visit: Visit): void {
    this.delegate.visitCompleted(visit)
    delete this.currentVisit
  }

  // Same-page links are no longer handled with a Visit.
  // This method is still needed for Turbo Native adapters.
  locationWithActionIsSamePage(_location: URL, _action?: Action): boolean {
    return false
  }

  // Visits

  get location(): URL {
    return this.history.location
  }

  get restorationIdentifier(): string {
    return this.history.restorationIdentifier
  }

  #getActionForFormSubmission(formSubmission: FormSubmission, fetchResponse: FetchResponse): Action {
    const { submitter, formElement } = formSubmission
    return getVisitAction(submitter, formElement) || this.#getDefaultAction(fetchResponse)
  }

  #getDefaultAction(fetchResponse: FetchResponse): Action {
    const sameLocationRedirect = fetchResponse.redirected && fetchResponse.location.href === this.location?.href
    return sameLocationRedirect ? "replace" : "advance"
  }

  #shouldRenderError(snapshot: PageSnapshot, fetchResponse: FetchResponse): boolean {
    const currentSignature = this.view.snapshot.headSnapshot.trackedElementSignature
    const newSignature = snapshot.headSnapshot.trackedElementSignature

    return fetchResponse.serverError ||
      (fetchResponse.clientError && snapshot.isVisitable && currentSignature !== "" && newSignature === "")
  }
}
