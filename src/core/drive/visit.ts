import { FetchMethod, FetchRequest, type FetchRequestDelegate } from "../../http/fetch_request"
import { getAnchor, locationIsVisitable } from "../url"
import { PageSnapshot } from "./page_snapshot"
import { getHistoryMethodForAction, removeTemporaryElementsFrom, uuid } from "../../util"
import { StreamMessage } from "../streams/stream_message"
import { ViewTransitioner } from "./view_transitioner"
import type { FetchResponse } from "../../http/fetch_response"
import type { Adapter } from "../native/adapter"
import type { History, RestorationData, VisitDirection } from "./history"

import type { PageView } from "./page_view"
import type { Action } from "../types"

export interface VisitDelegate {
  readonly adapter: Adapter
  readonly history: History
  readonly view: PageView

  visitStarted(visit: Visit): void
  visitCompleted(visit: Visit): void
}

export type TimingMetric = (typeof TimingMetric)[keyof typeof TimingMetric]

export type TimingMetrics = Partial<{ [metric in TimingMetric]: number }>

export type VisitState = (typeof VisitState)[keyof typeof VisitState]

export type VisitResponse = {
  statusCode: number
  redirected: boolean
  responseHTML?: string
}

export type RefreshOptions = { method?: "replace" | "morph" | null; scroll?: "reset" | "preserve" | null }

export type VisitOptions = {
  action: Action
  historyChanged: boolean
  referrer?: URL
  snapshot?: PageSnapshot
  snapshotHTML?: string
  response?: VisitResponse
  visitCachedSnapshot(snapshot: PageSnapshot): void
  willRender: boolean
  updateHistory: boolean
  restorationIdentifier?: string
  shouldCacheSnapshot: boolean
  frame?: string
  acceptsStreamResponse: boolean
  direction?: VisitDirection
  refresh: RefreshOptions
  scroll?: string
}

const defaultOptions: VisitOptions = {
  action: "advance",
  historyChanged: false,
  visitCachedSnapshot: () => {},
  willRender: true,
  updateHistory: true,
  shouldCacheSnapshot: true,
  acceptsStreamResponse: false,
  refresh: {},
  scroll: undefined
}

export const TimingMetric = {
  visitStart: "visitStart",
  requestStart: "requestStart",
  requestEnd: "requestEnd",
  visitEnd: "visitEnd"
} as const

export const VisitState = {
  initialized: "initialized",
  started: "started",
  canceled: "canceled",
  failed: "failed",
  completed: "completed"
} as const

export const SystemStatusCode = {
  networkFailure: 0,
  timeoutFailure: -1,
  contentTypeMismatch: -2
} as const

export const Direction: Readonly<Record<Action, VisitDirection>> = {
  advance: "forward",
  restore: "back",
  replace: "none"
}

export class Visit implements FetchRequestDelegate {
  #documentIdentifier: string

  readonly identifier = uuid() // Required by turbo-ios
  readonly timingMetrics: TimingMetrics = {}

  followedRedirect = false
  historyChanged = false
  scrolled = false
  shouldCacheSnapshot = true
  acceptsStreamResponse = false
  snapshotCached = false
  state: VisitState = VisitState.initialized
  readonly viewTransitioner = new ViewTransitioner()

  declare readonly delegate: VisitDelegate
  declare readonly location: URL
  declare readonly restorationIdentifier: string
  declare readonly action: Action
  declare readonly referrer?: URL
  declare readonly snapshot?: PageSnapshot
  declare readonly snapshotHTML?: string
  declare response?: VisitResponse
  declare readonly willRender: boolean
  declare readonly isPageRefresh: boolean
  declare readonly visitCachedSnapshot: (snapshot: PageSnapshot) => void
  declare readonly updateHistory: boolean
  declare readonly direction: VisitDirection
  declare readonly refresh: RefreshOptions
  declare readonly scroll?: string
  declare redirectedToLocation?: URL
  declare request?: FetchRequest
  declare frame?: number

  constructor(delegate: VisitDelegate, location: URL, restorationIdentifier?: string, options: Partial<VisitOptions> = {}) {
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
      direction,
      refresh,
      scroll
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
    this.willRender = willRender
    this.isPageRefresh = this.view.isPageRefresh(this)
    if (
      action === "restore" && historyChanged &&
      this.restorationIdentifier === this.history.restorationIdentifier
    ) {
      this.#documentIdentifier = this.history.entryDocumentIdentifier || uuid()
    } else if (!willRender) {
      this.#documentIdentifier = this.history.entryDocumentIdentifier || this.history.renderedDocumentIdentifier
    } else if (this.isPageRefresh && this.location.href === this.referrer?.href) {
      this.#documentIdentifier = this.history.renderedDocumentIdentifier
    } else {
      this.#documentIdentifier = uuid()
    }
    this.visitCachedSnapshot = visitCachedSnapshot
    this.updateHistory = updateHistory
    this.scrolled = !willRender
    this.shouldCacheSnapshot = shouldCacheSnapshot
    this.acceptsStreamResponse = acceptsStreamResponse
    this.direction = direction || Direction[action]
    this.refresh = refresh
    this.scroll = scroll
  }

  get adapter(): Adapter {
    return this.delegate.adapter
  }

  get view(): PageView {
    return this.delegate.view
  }

  get history(): History {
    return this.delegate.history
  }

  get restorationData(): RestorationData {
    return this.history.getRestorationDataForIdentifier(this.restorationIdentifier)
  }

  start(): void {
    if (this.state == VisitState.initialized) {
      this.recordTimingMetric(TimingMetric.visitStart)
      this.state = VisitState.started
      this.adapter.visitStarted(this)
      this.delegate.visitStarted(this)
    }
  }

  cancel(): void {
    if (this.state == VisitState.started) {
      if (this.request) {
        this.request.cancel()
      }
      this.cancelRender()
      this.state = VisitState.canceled
    }
  }

  complete(): void {
    if (this.state == VisitState.started) {
      this.recordTimingMetric(TimingMetric.visitEnd)
      this.adapter.visitCompleted(this)
      this.state = VisitState.completed
      this.followRedirect()

      if (!this.followedRedirect) {
        this.delegate.visitCompleted(this)
      }
    }
  }

  fail(): void {
    if (this.state == VisitState.started) {
      this.state = VisitState.failed
      this.adapter.visitFailed(this)
      this.delegate.visitCompleted(this)
    }
  }

  changeHistory(): void {
    if (!this.historyChanged && this.updateHistory) {
      const actionForHistory = this.location.href === this.referrer?.href ? "replace" : this.action
      const method = getHistoryMethodForAction(actionForHistory)
      this.history.update(method, this.#locationForHistory, this.restorationIdentifier, { documentIdentifier: this.#documentIdentifier })
      this.historyChanged = true
    }
  }

  recordDocument(): void {
    if (this.willRender || this.history.entryDocumentIdentifier === this.#documentIdentifier) {
      this.history.adoptDocument(this.#documentIdentifier)
    }
  }

  issueRequest(): void {
    if (this.hasPreloadedResponse()) {
      this.simulateRequest()
    } else if (this.shouldIssueRequest() && !this.request) {
      this.request = new FetchRequest(this, FetchMethod.get, this.location)
      this.request.perform()
    }
  }

  simulateRequest(): void {
    if (this.response) {
      this.startRequest()
      this.recordResponse()
      this.finishRequest()
    }
  }

  startRequest(): void {
    this.recordTimingMetric(TimingMetric.requestStart)
    this.adapter.visitRequestStarted(this)
  }

  recordResponse(response: VisitResponse | undefined = this.response): void {
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

  finishRequest(): void {
    this.recordTimingMetric(TimingMetric.requestEnd)
    this.adapter.visitRequestFinished(this)
  }

  loadResponse(): void {
    if (this.response) {
      const { statusCode, responseHTML } = this.response
      this.render(async () => {
        if (this.shouldCacheSnapshot) this.cacheSnapshot()
        if (this.view.renderPromise) await this.view.renderPromise

        if (isSuccessful(statusCode) && responseHTML != null) {
          const snapshot = PageSnapshot.fromHTMLString(responseHTML)
          await this.renderPageSnapshot(snapshot, false)

          this.adapter.visitRendered(this)
          this.complete()
        } else {
          await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML), this)
          this.performScroll()
          this.adapter.visitRendered(this)
          this.fail()
        }
      })
    }
  }

  getCachedSnapshot(): PageSnapshot | undefined {
    const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot()

    if (snapshot && (!getAnchor(this.location) || snapshot.hasAnchor(getAnchor(this.location)))) {
      if (this.action == "restore" || snapshot.isPreviewable) {
        return snapshot
      }
    }
  }

  getPreloadedSnapshot(): PageSnapshot | undefined {
    if (this.snapshotHTML) {
      return PageSnapshot.fromHTMLString(this.snapshotHTML)
    }
  }

  hasCachedSnapshot(): boolean {
    return this.getCachedSnapshot() != null
  }

  loadCachedSnapshot(): void {
    const snapshot = this.getCachedSnapshot()
    if (snapshot) {
      const isPreview = this.shouldIssueRequest()
      this.render(async () => {
        if (this.shouldCacheSnapshot) this.cacheSnapshot()
        if (this.isPageRefresh) {
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

  followRedirect(): void {
    if (this.redirectedToLocation && !this.followedRedirect && this.response?.redirected && !this.view.forceReloaded) {
      this.adapter.visitProposedToLocation(this.redirectedToLocation, {
        action: "replace",
        response: this.response,
        shouldCacheSnapshot: false,
        willRender: false
      })
      this.followedRedirect = true
    }
  }

  // Fetch request delegate

  prepareRequest(request: FetchRequest): void {
    if (this.acceptsStreamResponse) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted(): void {
    this.startRequest()
  }

  requestPreventedHandlingResponse(_request: FetchRequest, _response: FetchResponse): void {}

  async requestSucceededWithResponse(request: FetchRequest, response: FetchResponse): Promise<void> {
    let responseHTML
    try {
      responseHTML = await response.responseHTML
    } catch (error) {
      return this.#responseBodyErrored(request, error)
    }
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

  async requestFailedWithResponse(request: FetchRequest, response: FetchResponse): Promise<void> {
    let responseHTML
    try {
      responseHTML = await response.responseHTML
    } catch (error) {
      return this.#responseBodyErrored(request, error)
    }
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

  requestErrored(_request: FetchRequest, _error: unknown): void {
    this.recordResponse({
      statusCode: SystemStatusCode.networkFailure,
      redirected: false
    })
  }

  requestFinished(): void {
    this.finishRequest()
  }

  #responseBodyErrored(request: FetchRequest, error: unknown): void {
    if (!request.abortSignal.aborted) this.requestErrored(request, error)
  }

  // Scrolling

  performScroll(): void {
    if (!this.scrolled && !this.view.forceReloaded && !this.view.shouldPreserveScrollPosition(this)) {
      if (this.action == "restore") {
        this.scrollToRestoredPosition() || this.scrollToAnchor() || this.view.scrollToTop()
      } else {
        this.scrollToAnchor() || this.view.scrollToTop()
      }

      this.scrolled = true
    }
  }

  scrollToRestoredPosition(): true | undefined {
    const { scrollPosition } = this.restorationData
    if (scrollPosition) {
      this.view.scrollToPosition(scrollPosition)
      return true
    }
  }

  scrollToAnchor(): true | undefined {
    const anchor = getAnchor(this.location)
    if (anchor != null) {
      this.view.scrollToAnchor(anchor)
      return true
    }
  }

  // Instrumentation

  recordTimingMetric(metric: TimingMetric): void {
    this.timingMetrics[metric] = new Date().getTime()
  }

  getTimingMetrics(): TimingMetrics {
    return { ...this.timingMetrics }
  }

  // Private

  get #locationForHistory(): URL {
    const { redirectedToLocation } = this
    if (redirectedToLocation && locationIsVisitable(redirectedToLocation, this.view.snapshot.rootLocation)) {
      return redirectedToLocation
    } else {
      return this.location
    }
  }

  hasPreloadedResponse(): boolean {
    return typeof this.response == "object"
  }

  shouldIssueRequest(): boolean {
    if (this.action == "restore") {
      return !this.hasCachedSnapshot()
    } else {
      return this.willRender
    }
  }

  cacheSnapshot(): void {
    if (!this.snapshotCached) {
      // Cache notifications prepare the live document. They cannot affect a supplied
      // snapshot and would instead mutate the page that remains visible.
      const shouldNotifyApplication = !this.snapshot
      this.view.cacheSnapshot(this.snapshot, shouldNotifyApplication).then((snapshot) => {
        if (snapshot) {
          this.visitCachedSnapshot(snapshot)

          // The callback can restore temporary elements with the previous frame contents,
          // so remove them only after the cached snapshot has been prepared.
          removeTemporaryElementsFrom(snapshot.element)
        }
      })
      this.snapshotCached = true
    }
  }

  async render(callback: () => Promise<void>): Promise<void> {
    this.cancelRender()
    await new Promise<void>((resolve) => {
      // TODO(types): a setTimeout id can land here and is later passed to cancelAnimationFrame (likely upstream bug)
      this.frame =
        document.visibilityState === "hidden" ? (setTimeout(() => resolve(), 0) as unknown as number) : requestAnimationFrame(() => resolve())
    })
    await callback()
    delete this.frame
  }

  async renderPageSnapshot(snapshot: PageSnapshot, isPreview: boolean): Promise<void> {
    await this.viewTransitioner.renderChange(this.willRender && this.view.shouldTransitionTo(snapshot), async () => {
      await this.view.renderPage(snapshot, isPreview, this.willRender, this)
      this.performScroll()
    })
  }

  cancelRender(): void {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      delete this.frame
    }
  }
}

function isSuccessful(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300
}
