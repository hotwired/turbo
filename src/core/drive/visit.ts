import { Adapter } from "../native/adapter"
import { FetchMethod, FetchRequest, FetchRequestDelegate } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { History } from "./history"
import { getAnchor } from "../url"
import { Snapshot } from "../snapshot"
import { PageSnapshot } from "./page_snapshot"
import { Action } from "../types"
import { uuid } from "../../util"
import { PageView } from "./page_view"

export interface VisitDelegate {
  readonly adapter: Adapter
  readonly history: History
  readonly view: PageView

  visitStarted(visit: Visit): void
  visitCompleted(visit: Visit): void
  locationWithActionIsSamePage(location: URL, action: Action): boolean
  visitScrolledToSamePageLocation(oldURL: URL, newURL: URL): void
}

export enum TimingMetric {
  visitStart = "visitStart",
  requestStart = "requestStart",
  requestEnd = "requestEnd",
  visitEnd = "visitEnd"
}

export type TimingMetrics = Partial<{ [metric in TimingMetric]: any }>

export enum VisitState {
  initialized = "initialized",
  started = "started",
  canceled = "canceled",
  failed = "failed",
  completed = "completed"
}

export type VisitOptions = {
  action: Action,
  historyChanged: boolean,
  referrer?: URL,
  snapshotHTML?: string,
  response?: VisitResponse
  visitCachedSnapshot(snapshot: Snapshot): void
  willRender: boolean
}

const defaultOptions: VisitOptions = {
  action: "advance",
  historyChanged: false,
  visitCachedSnapshot: () => {},
  willRender: true,
}

export type VisitResponse = {
  statusCode: number,
  redirected: boolean,
  responseHTML?: string
}

export enum SystemStatusCode {
  networkFailure = 0,
  timeoutFailure = -1,
  contentTypeMismatch = -2
}

export class Visit implements FetchRequestDelegate {
  readonly delegate: VisitDelegate
  readonly identifier = uuid()
  readonly restorationIdentifier: string
  readonly action: Action
  readonly referrer?: URL
  readonly timingMetrics: TimingMetrics = {}
  readonly visitCachedSnapshot: (snapshot: Snapshot) => void
  readonly willRender: boolean

  followedRedirect = false
  frame?: number
  historyChanged = false
  location: URL
  isSamePage: boolean
  redirectedToLocation?: URL
  request?: FetchRequest
  response?: VisitResponse
  scrolled = false
  snapshotHTML?: string
  snapshotCached = false
  state = VisitState.initialized

  constructor(delegate: VisitDelegate, location: URL, restorationIdentifier: string | undefined, options: Partial<VisitOptions> = {}) {
    this.delegate = delegate
    this.location = location
    this.restorationIdentifier = restorationIdentifier || uuid()

    const { action, historyChanged, referrer, snapshotHTML, response, visitCachedSnapshot, willRender } = { ...defaultOptions, ...options }
    this.action = action
    this.historyChanged = historyChanged
    this.referrer = referrer
    this.snapshotHTML = snapshotHTML
    this.response = response
    this.isSamePage = this.delegate.locationWithActionIsSamePage(this.location, this.action)
    this.visitCachedSnapshot = visitCachedSnapshot
    this.willRender = willRender
    this.scrolled = !willRender
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

  get restorationData() {
    return this.history.getRestorationDataForIdentifier(this.restorationIdentifier)
  }

  get silent() {
    return this.isSamePage
  }

  start() {
    if (this.state == VisitState.initialized) {
      this.recordTimingMetric(TimingMetric.visitStart)
      this.state = VisitState.started
      this.adapter.visitStarted(this)
      this.delegate.visitStarted(this)
    }
  }

  cancel() {
    if (this.state == VisitState.started) {
      if (this.request) {
        this.request.cancel()
      }
      this.cancelRender()
      this.state = VisitState.canceled
    }
  }

  complete() {
    if (this.state == VisitState.started) {
      this.recordTimingMetric(TimingMetric.visitEnd)
      this.state = VisitState.completed
      this.adapter.visitCompleted(this)
      this.delegate.visitCompleted(this)
      this.followRedirect()
    }
  }

  fail() {
    if (this.state == VisitState.started) {
      this.state = VisitState.failed
      this.adapter.visitFailed(this)
    }
  }

  changeHistory() {
    if (!this.historyChanged) {
      const actionForHistory = this.location.href === this.referrer?.href ? "replace" : this.action
      const method = this.getHistoryMethodForAction(actionForHistory)
      this.history.update(method, this.location, this.restorationIdentifier)
      this.historyChanged = true
    }
  }

  issueRequest() {
    if (this.hasPreloadedResponse()) {
      this.simulateRequest()
    } else if (this.shouldIssueRequest() && !this.request) {
      this.request = new FetchRequest(this, FetchMethod.get, this.location)
      this.request.perform()
    }
  }

  simulateRequest() {
    if (this.response) {
      this.startRequest()
      this.recordResponse()
      this.finishRequest()
    }
  }

  startRequest() {
    this.recordTimingMetric(TimingMetric.requestStart)
    this.adapter.visitRequestStarted(this)
  }

  recordResponse(response = this.response) {
    this.response = response
    if (response) {
      const { statusCode } = response
      if (isSuccessful(statusCode)) {
        this.adapter.visitRequestCompleted(this)
      } else {
        this.adapter.visitRequestFailedWithStatusCode(this, statusCode)
      }
    }
  }

  finishRequest() {
    this.recordTimingMetric(TimingMetric.requestEnd)
    this.adapter.visitRequestFinished(this)
  }

  loadResponse() {
    if (this.response) {
      const { statusCode, responseHTML } = this.response
      this.render(async () => {
        this.cacheSnapshot()
        if (this.view.renderPromise) await this.view.renderPromise
        if (isSuccessful(statusCode) && responseHTML != null) {
          await this.view.renderPage(PageSnapshot.fromHTMLString(responseHTML), false, this.willRender)
          this.adapter.visitRendered(this)
          this.complete()
        } else {
          await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML))
          this.adapter.visitRendered(this)
          this.fail()
        }
      })
    }
  }

  getCachedSnapshot() {
    const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot()

    if (snapshot && (!getAnchor(this.location) || snapshot.hasAnchor(getAnchor(this.location)))) {
      if (this.action == "restore" || snapshot.isPreviewable) {
        return snapshot
      }
    }
  }

  getPreloadedSnapshot() {
    if (this.snapshotHTML) {
      return PageSnapshot.fromHTMLString(this.snapshotHTML)
    }
  }

  hasCachedSnapshot() {
    return this.getCachedSnapshot() != null
  }

  loadCachedSnapshot() {
    const snapshot = this.getCachedSnapshot()
    if (snapshot && this.hasPreloadedResponse()) {
      const isPreview = this.shouldIssueRequest()
      this.render(async () => {
        this.cacheSnapshot()
        if (this.isSamePage) {
          this.adapter.visitRendered(this)
        } else {
          if (this.view.renderPromise) await this.view.renderPromise
          await this.view.renderPage(snapshot, isPreview, this.willRender)
          this.adapter.visitRendered(this)
          if (!isPreview) {
            this.complete()
          }
        }
      })
    }
  }

  followRedirect() {
    if (this.redirectedToLocation && !this.followedRedirect && this.response?.redirected) {
      this.adapter.visitProposedToLocation(this.redirectedToLocation, {
        action: 'replace',
        response: this.response
      })
      this.followedRedirect = true
    }
  }

  goToSamePageAnchor() {
    if (this.isSamePage) {
      this.render(async () => {
        this.cacheSnapshot()
        this.adapter.visitRendered(this)
      })
    }
  }

  // Fetch request delegate

  requestStarted() {
    this.startRequest()
  }

  requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse) {

  }

  async requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {
    const responseHTML = await response.responseHTML
    const { redirected, statusCode } = response
    if (responseHTML == undefined) {
      this.recordResponse({ statusCode: SystemStatusCode.contentTypeMismatch, redirected })
    } else {
      this.redirectedToLocation = response.redirected ? response.location : undefined
      this.recordResponse({ statusCode: statusCode, responseHTML, redirected })
    }
  }

  async requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    const responseHTML = await response.responseHTML
    const { redirected, statusCode } = response
    if (responseHTML == undefined) {
      this.recordResponse({ statusCode: SystemStatusCode.contentTypeMismatch, redirected })
    } else {
      this.recordResponse({ statusCode: statusCode, responseHTML, redirected })
    }
  }

  requestErrored(request: FetchRequest, error: Error) {
    this.recordResponse({ statusCode: SystemStatusCode.networkFailure, redirected: false })
  }

  requestFinished() {
    this.finishRequest()
  }

  // Scrolling

  performScroll() {
    if (!this.scrolled) {
      if (this.action == "restore") {
        this.scrollToRestoredPosition() || this.scrollToAnchor() || this.view.scrollToTop()
      } else {
        this.scrollToAnchor() || this.view.scrollToTop()
      }
      if (this.isSamePage) {
        this.delegate.visitScrolledToSamePageLocation(this.view.lastRenderedLocation, this.location)
      }

      this.scrolled = true
    }
  }

  scrollToRestoredPosition() {
    const { scrollPosition } = this.restorationData
    if (scrollPosition) {
      this.view.scrollToPosition(scrollPosition)
      return true
    }
  }

  scrollToAnchor() {
    const anchor = getAnchor(this.location)
    if (anchor != null) {
      this.view.scrollToAnchor(anchor)
      return true
    }
  }

  // Instrumentation

  recordTimingMetric(metric: TimingMetric) {
    this.timingMetrics[metric] = new Date().getTime()
  }

  getTimingMetrics(): TimingMetrics {
    return { ...this.timingMetrics }
  }

  // Private

  getHistoryMethodForAction(action: Action) {
    switch (action) {
      case "replace": return history.replaceState
      case "advance":
      case "restore": return history.pushState
    }
  }

  hasPreloadedResponse() {
    return typeof this.response == "object"
  }

  shouldIssueRequest() {
    if (this.isSamePage) {
      return false
    } else if (this.action == "restore") {
      return !this.hasCachedSnapshot()
    } else {
      return this.willRender
    }
  }

  cacheSnapshot() {
    if (!this.snapshotCached) {
      this.view.cacheSnapshot().then(snapshot => snapshot && this.visitCachedSnapshot(snapshot))
      this.snapshotCached = true
    }
  }

  async render(callback: () => Promise<void>) {
    this.cancelRender()
    await new Promise<void>(resolve => {
      this.frame = requestAnimationFrame(() => resolve())
    })
    await callback()
    delete this.frame
    this.performScroll()
  }

  cancelRender() {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      delete this.frame
    }
  }
}

function isSuccessful(statusCode: number) {
  return statusCode >= 200 && statusCode < 300
}
