import { Adapter } from "./adapter"
import { History } from "./history"
import { HttpRequest } from "./http_request"
import { Location } from "./location"
import { RenderCallback } from "./renderer"
import { Snapshot } from "./snapshot"
import { Action } from "./types"
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
  referrer?: Location
}

const defaultOptions: VisitOptions = {
  action: "advance",
  historyChanged: false
}

export type VisitResponse = {
  requestFailed?: boolean,
  responseHTML: string
}

export class Visit {
  readonly delegate: VisitDelegate
  readonly restorationIdentifier: string
  readonly action: Action
  readonly referrer?: Location
  readonly timingMetrics: TimingMetrics = {}

  followedRedirect = false
  frame?: number
  historyChanged = false
  location: Location
  progress = 0
  redirectedToLocation?: Location
  request?: HttpRequest
  response?: VisitResponse
  scrolled = false
  snapshotCached = false
  state = VisitState.initialized

  constructor(delegate: VisitDelegate, location: Location, restorationIdentifier: string, options: Partial<VisitOptions> = {}) {
    this.delegate = delegate
    this.location = location
    this.restorationIdentifier = restorationIdentifier

    const { action, historyChanged, referrer } = { ...defaultOptions, ...options }
    this.action = action
    this.historyChanged = historyChanged
    this.referrer = referrer
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
        this.view.render({ snapshot, isPreview }, this.performScroll)
        this.adapter.visitRendered(this)
        if (!isPreview) {
          this.complete()
        }
      })
    }
  }

  loadResponse(response = this.response) {
    if (response) {
      const { requestFailed, responseHTML } = response
      this.render(() => {
        this.cacheSnapshot()
        if (requestFailed) {
          this.view.render({ error: responseHTML }, this.performScroll)
          this.adapter.visitRendered(this)
          this.fail()
        } else {
          this.view.render({ snapshot: Snapshot.fromHTMLString(responseHTML) }, this.performScroll)
          this.adapter.visitRendered(this)
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

  requestCompletedWithResponse(responseHTML: string, redirectedToLocation?: Location) {
    this.response = { requestFailed: false, responseHTML }
    this.redirectedToLocation = redirectedToLocation
    this.adapter.visitRequestCompleted(this)
  }

  requestFailedWithStatusCode(statusCode: number, responseHTML: string) {
    this.response = { requestFailed: true, responseHTML }
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
