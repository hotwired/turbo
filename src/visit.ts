import { Adapter } from "./adapter"
import { RestorationData } from "./controller"
import { HttpRequest } from "./http_request"
import { Locatable, Location } from "./location"
import { RenderCallback } from "./renderer"
import { Snapshot } from "./snapshot"
import { Action } from "./types"
import { uuid } from "./util"
import { RenderOptions, View } from "./view"

export interface VisitDelegate {
  readonly adapter: Adapter
  readonly view: View

  render(options: Partial<RenderOptions>, callback: RenderCallback): void
  pushHistoryWithLocationAndRestorationIdentifier(locatable: Locatable, restorationIdentifier: string): void
  replaceHistoryWithLocationAndRestorationIdentifier(locatable: Locatable, restorationIdentifier: string): void
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

export class Visit {
  readonly delegate: VisitDelegate
  readonly action: Action
  readonly identifier = uuid()
  readonly restorationIdentifier: string
  readonly timingMetrics: TimingMetrics = {}

  followedRedirect = false
  frame?: number
  historyChanged = false
  location: Location
  progress = 0
  referrer?: Location
  redirectedToLocation?: Location
  request?: HttpRequest
  response?: string
  restorationData?: RestorationData
  scrolled = false
  snapshotCached = false
  state = VisitState.initialized

  constructor(delegate: VisitDelegate, location: Location, action: Action, restorationIdentifier: string = uuid()) {
    this.delegate = delegate
    this.location = location
    this.action = action
    this.restorationIdentifier = restorationIdentifier
  }

  get adapter() {
    return this.delegate.adapter
  }

  get view() {
    return this.delegate.view
  }

  start() {
    if (this.state == VisitState.initialized) {
      this.recordTimingMetric(TimingMetric.visitStart)
      this.state = VisitState.started
      this.adapter.visitStarted(this)
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
      method.call(this.delegate, this.location, this.restorationIdentifier)
      this.historyChanged = true
    }
  }

  issueRequest() {
    if (this.shouldIssueRequest() && !this.request) {
      this.progress = 0
      this.request = new HttpRequest(this, this.location, this.referrer)
      this.request.send()
    }
  }

  getCachedSnapshot() {
    const snapshot = this.view.getCachedSnapshotForLocation(this.location)
    if (snapshot && (!this.location.anchor || snapshot.hasAnchor(this.location.anchor))) {
      if (this.action == "restore" || snapshot.isPreviewable()) {
        return snapshot
      }
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
        this.delegate.render({ snapshot, isPreview }, this.performScroll)
        this.adapter.visitRendered(this)
        if (!isPreview) {
          this.complete()
        }
      })
    }
  }

  loadResponse() {
    const { request, response } = this
    if (request && response) {
      this.render(() => {
        this.cacheSnapshot()
        if (request.failed) {
          this.delegate.render({ error: this.response }, this.performScroll)
          this.adapter.visitRendered(this)
          this.fail()
        } else {
          this.delegate.render({ snapshot: Snapshot.fromHTMLString(response) }, this.performScroll)
          this.adapter.visitRendered(this)
          this.complete()
        }
      })
    }
  }

  followRedirect() {
    if (this.redirectedToLocation && !this.followedRedirect) {
      this.location = this.redirectedToLocation
      this.delegate.replaceHistoryWithLocationAndRestorationIdentifier(this.redirectedToLocation, this.restorationIdentifier)
      this.followedRedirect = true
    }
  }

  // HTTP request delegate

  requestStarted() {
    this.recordTimingMetric(TimingMetric.requestStart)
    this.adapter.visitRequestStarted(this)
  }

  requestProgressed(progress: number) {
    this.progress = progress
    if (this.adapter.visitRequestProgressed) {
      this.adapter.visitRequestProgressed(this)
    }
  }

  requestCompletedWithResponse(response: string, redirectedToLocation?: Location) {
    this.response = response
    this.redirectedToLocation = redirectedToLocation
    this.adapter.visitRequestCompleted(this)
  }

  requestFailedWithStatusCode(statusCode: number, response?: string) {
    this.response = response
    this.adapter.visitRequestFailedWithStatusCode(this, statusCode)
  }

  requestFinished() {
    this.recordTimingMetric(TimingMetric.requestEnd)
    this.adapter.visitRequestFinished(this)
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
    const position = this.restorationData ? this.restorationData.scrollPosition : undefined
    if (position) {
      this.view.scrollToPosition(position)
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
      case "replace": return this.delegate.replaceHistoryWithLocationAndRestorationIdentifier
      case "advance":
      case "restore": return this.delegate.pushHistoryWithLocationAndRestorationIdentifier
    }
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
