import { FetchMethod, FetchRequest } from "../../http/fetch_request"
import { getAnchor } from "../url"
import { PageSnapshot } from "./page_snapshot"
import { getHistoryMethodForAction, uuid } from "../../util"
import { StreamMessage } from "../streams/stream_message"
import { ViewTransitioner } from "./view_transitioner"

const defaultOptions = {
  action: "advance",
  historyChanged: false,
  visitCachedSnapshot: () => {},
  willRender: true,
  updateHistory: true,
  shouldCacheSnapshot: true,
  acceptsStreamResponse: false
}

export const TimingMetric = {
  visitStart: "visitStart",
  requestStart: "requestStart",
  requestEnd: "requestEnd",
  visitEnd: "visitEnd"
}

export const VisitState = {
  initialized: "initialized",
  started: "started",
  canceled: "canceled",
  failed: "failed",
  completed: "completed"
}

export const SystemStatusCode = {
  networkFailure: 0,
  timeoutFailure: -1,
  contentTypeMismatch: -2
}

export const Direction = {
  advance: "forward",
  restore: "back",
  replace: "none"
}

export class Visit {
  identifier = uuid() // Required by turbo-ios
  timingMetrics = {}

  followedRedirect = false
  historyChanged = false
  scrolled = false
  shouldCacheSnapshot = true
  acceptsStreamResponse = false
  snapshotCached = false
  state = VisitState.initialized
  viewTransitioner = new ViewTransitioner()

  constructor(delegate, location, restorationIdentifier, options = {}) {
    this.delegate = delegate
    this.location = location
    this.restorationIdentifier = restorationIdentifier || uuid()

    const {
      action,
      historyChanged,
      referrer,
      snapshot,
      snapshotHTML,
      response,
      visitCachedSnapshot,
      willRender,
      updateHistory,
      shouldCacheSnapshot,
      acceptsStreamResponse,
      direction
    } = {
      ...defaultOptions,
      ...options
    }
    this.action = action
    this.historyChanged = historyChanged
    this.referrer = referrer
    this.snapshot = snapshot
    this.snapshotHTML = snapshotHTML
    this.response = response
    this.isSamePage = this.delegate.locationWithActionIsSamePage(this.location, this.action)
    this.visitCachedSnapshot = visitCachedSnapshot
    this.willRender = willRender
    this.updateHistory = updateHistory
    this.scrolled = !willRender
    this.shouldCacheSnapshot = shouldCacheSnapshot
    this.acceptsStreamResponse = acceptsStreamResponse
    this.direction = direction || Direction[action]
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
      this.followRedirect()

      if (!this.followedRedirect) {
        this.adapter.visitCompleted(this)
        this.delegate.visitCompleted(this)
      }
    }
  }

  fail() {
    if (this.state == VisitState.started) {
      this.state = VisitState.failed
      this.adapter.visitFailed(this)
      this.delegate.visitCompleted(this)
    }
  }

  changeHistory() {
    if (!this.historyChanged && this.updateHistory) {
      const actionForHistory = this.location.href === this.referrer?.href ? "replace" : this.action
      const method = getHistoryMethodForAction(actionForHistory)
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
        if (this.shouldCacheSnapshot) await this.cacheSnapshot()
        if (this.view.renderPromise) await this.view.renderPromise

        if (isSuccessful(statusCode) && responseHTML != null) {
          const snapshot = PageSnapshot.fromHTMLString(responseHTML)
          await this.renderPageSnapshot(snapshot, false)

          this.adapter.visitRendered(this)
          this.complete()
        } else {
          await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML), this)
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
    if (snapshot) {
      const isPreview = this.shouldIssueRequest()
      this.render(async () => {
        await this.cacheSnapshot()
        if (this.isSamePage) {
          this.adapter.visitRendered(this)
        } else {
          if (this.view.renderPromise) await this.view.renderPromise

          await this.renderPageSnapshot(snapshot, isPreview)

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
        action: "replace",
        response: this.response,
        shouldCacheSnapshot: false,
        willRender: false
      })
      this.followedRedirect = true
    }
  }

  goToSamePageAnchor() {
    if (this.isSamePage) {
      this.render(async () => {
        await this.cacheSnapshot()
        this.performScroll()
        this.changeHistory()
        this.adapter.visitRendered(this)
      })
    }
  }

  // Fetch request delegate

  prepareRequest(request) {
    if (this.acceptsStreamResponse) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted() {
    this.startRequest()
  }

  requestPreventedHandlingResponse(_request, _response) {}

  async requestSucceededWithResponse(request, response) {
    const responseHTML = await response.responseHTML
    const { redirected, statusCode } = response
    if (responseHTML == undefined) {
      this.recordResponse({
        statusCode: SystemStatusCode.contentTypeMismatch,
        redirected
      })
    } else {
      this.redirectedToLocation = response.redirected ? response.location : undefined
      this.recordResponse({ statusCode: statusCode, responseHTML, redirected })
    }
  }

  async requestFailedWithResponse(request, response) {
    const responseHTML = await response.responseHTML
    const { redirected, statusCode } = response
    if (responseHTML == undefined) {
      this.recordResponse({
        statusCode: SystemStatusCode.contentTypeMismatch,
        redirected
      })
    } else {
      this.recordResponse({ statusCode: statusCode, responseHTML, redirected })
    }
  }

  requestErrored(_request, _error) {
    this.recordResponse({
      statusCode: SystemStatusCode.networkFailure,
      redirected: false
    })
  }

  requestFinished() {
    this.finishRequest()
  }

  // Scrolling

  performScroll() {
    if (!this.scrolled && !this.view.forceReloaded && !this.view.snapshot.shouldPreserveScrollPosition) {
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

  recordTimingMetric(metric) {
    this.timingMetrics[metric] = new Date().getTime()
  }

  getTimingMetrics() {
    return { ...this.timingMetrics }
  }

  // Private

  getHistoryMethodForAction(action) {
    switch (action) {
      case "replace":
        return history.replaceState
      case "advance":
      case "restore":
        return history.pushState
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

  async cacheSnapshot() {
    if (!this.snapshotCached) {
      await this.view.cacheSnapshot(this.snapshot).then((snapshot) => snapshot && this.visitCachedSnapshot(snapshot))
      this.snapshotCached = true
    }
  }

  async render(callback) {
    this.cancelRender()
    await new Promise((resolve) => {
      this.frame = requestAnimationFrame(() => resolve())
    })
    await callback()
    delete this.frame
  }

  async renderPageSnapshot(snapshot, isPreview) {
    await this.viewTransitioner.renderChange(this.view.shouldTransitionTo(snapshot), async () => {
      await this.view.renderPage(snapshot, isPreview, this.willRender, this)
      this.performScroll()
    })
  }

  cancelRender() {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      delete this.frame
    }
  }
}

function isSuccessful(statusCode) {
  return statusCode >= 200 && statusCode < 300
}
