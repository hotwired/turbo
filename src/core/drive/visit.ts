import { Adapter } from "../native/adapter"
import { FetchMethod, FetchRequest, FetchRequestDelegate } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { History } from "./history"
import { Location } from "../location"
import { RenderCallback } from "./renderer"
import { Snapshot } from "./snapshot"
import { Action } from "../types"
import { uuid } from "../../util"
import { View } from "./view"

export interface VisitDelegate {
  readonly adapter: Adapter
  readonly view: View
  readonly history: History

  visitStarted(visit: Visit): void
  visitCompleted(visit: Visit): void
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
  referrer?: Location,
  snapshotHTML?: string,
  response?: VisitResponse
}

const defaultOptions: VisitOptions = {
  action: "advance",
  historyChanged: false
}

export type VisitResponse = {
  statusCode: number,
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
  readonly referrer?: Location
  readonly timingMetrics: TimingMetrics = {}

  followedRedirect = false
  frame?: number
  historyChanged = false
  location: Location
  redirectedToLocation?: Location
  request?: FetchRequest
  response?: VisitResponse
  scrolled = false
  snapshotHTML?: string
  snapshotCached = false
  state = VisitState.initialized

  constructor(delegate: VisitDelegate, location: Location, restorationIdentifier: string | undefined, options: Partial<VisitOptions> = {}) {
    this.delegate = delegate
    this.location = location
    this.restorationIdentifier = restorationIdentifier || uuid()

    const { action, historyChanged, referrer, snapshotHTML, response } = { ...defaultOptions, ...options }
    this.action = action
    this.historyChanged = historyChanged
    this.referrer = referrer
    this.snapshotHTML = snapshotHTML
    this.response = response
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
      const actionForHistory = this.location.isEqualTo(this.referrer) ? "replace" : this.action
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
      this.render(() => {
        this.cacheSnapshot()
        if (isSuccessful(statusCode) && responseHTML != null) {
          this.view.render({ snapshot: Snapshot.fromHTMLString(responseHTML) }, this.performScroll)
          this.adapter.visitRendered(this)
          this.complete()
        } else {
          this.view.render({ error: responseHTML }, this.performScroll)
          this.adapter.visitRendered(this)
          this.fail()
        }
      })
    }
  }

  getCachedSnapshot() {
    const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot()

    if (snapshot && (!this.location.anchor || snapshot.hasAnchor(this.location.anchor))) {
      if (this.action == "restore" || snapshot.isPreviewable()) {
        return snapshot
      }
    }
  }

  getPreloadedSnapshot() {
    if (this.snapshotHTML) {
      return Snapshot.wrap(this.snapshotHTML)
    }
  }

  hasCachedSnapshot() {
    return this.getCachedSnapshot() != null
  }

  loadCachedSnapshot() {
    const snapshot = this.getCachedSnapshot()
    if (snapshot) {
      const isPreview = this.shouldIssueRequest()
      this.render(() => {
        this.cacheSnapshot()
        this.view.render({ snapshot, isPreview }, this.performScroll)
        this.adapter.visitRendered(this)
        if (!isPreview) {
          this.complete()
        }
      })
    }
  }

  followRedirect() {
    if (this.redirectedToLocation && !this.followedRedirect) {
      this.location = this.redirectedToLocation
      this.history.replace(this.redirectedToLocation, this.restorationIdentifier)
      this.followedRedirect = true
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
    if (responseHTML == undefined) {
      this.recordResponse({ statusCode: SystemStatusCode.contentTypeMismatch })
    } else {
      this.redirectedToLocation = response.redirected ? response.location : undefined
      this.recordResponse({ statusCode: response.statusCode, responseHTML })
    }
  }

  async requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    const responseHTML = await response.responseHTML
    if (responseHTML == undefined) {
      this.recordResponse({ statusCode: SystemStatusCode.contentTypeMismatch })
    } else {
      this.recordResponse({ statusCode: response.statusCode, responseHTML })
    }
  }

  requestErrored(request: FetchRequest, error: Error) {
    this.recordResponse({ statusCode: SystemStatusCode.networkFailure })
  }

  requestFinished() {
    this.finishRequest()
  }

  // Scrolling

  performScroll = () => {
    if (!this.scrolled) {
      if (this.action == "restore") {
        this.scrollToRestoredPosition() || this.scrollToTop()
      } else {
        this.scrollToAnchor() || this.scrollToTop()
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
    if (this.location.anchor != null) {
      this.view.scrollToAnchor(this.location.anchor)
      return true
    }
  }

  scrollToTop() {
    this.view.scrollToPosition({ x: 0, y: 0 })
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
    return this.action == "restore"
      ? !this.hasCachedSnapshot()
      : true
  }

  cacheSnapshot() {
    if (!this.snapshotCached) {
      this.view.cacheSnapshot()
      this.snapshotCached = true
    }
  }

  render(callback: RenderCallback) {
    this.cancelRender()
    this.frame = requestAnimationFrame(() => {
      delete this.frame
      callback.call(this)
    })
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
