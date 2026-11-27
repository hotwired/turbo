import { BrowserAdapter, type BrowserAdapterSession } from "./native/browser_adapter"
import { CacheObserver } from "../observers/cache_observer"
import { FormSubmitObserver, type FormSubmitObserverDelegate } from "../observers/form_submit_observer"
import { FrameRedirector, type FrameRedirectorSession } from "./frames/frame_redirector"
import { History, type HistoryDelegate, type VisitDirection } from "./drive/history"
import { LinkPrefetchObserver, type LinkPrefetchObserverDelegate } from "../observers/link_prefetch_observer"
import { LinkClickObserver, type LinkClickObserverDelegate } from "../observers/link_click_observer"
import { FormLinkClickObserver, type FormLinkClickObserverDelegate } from "../observers/form_link_click_observer"
import { getAction, expandURL, locationIsVisitable, type Locatable } from "./url"
import { Navigator, type NavigatorDelegate } from "./drive/navigator"
import {
  VisitState,
  type Visit,
  type VisitOptions,
  type TimingMetrics,
  type RefreshOptions as VisitRefreshOptions
} from "./drive/visit"
import { PageObserver, type PageObserverDelegate } from "../observers/page_observer"
import { ScrollObserver, type ScrollObserverDelegate } from "../observers/scroll_observer"
import { StreamMessage } from "./streams/stream_message"
import { StreamMessageRenderer } from "./streams/stream_message_renderer"
import { StreamObserver, type StreamObserverDelegate } from "../observers/stream_observer"
import { clearBusyState, dispatch, findClosestRecursively, getVisitAction, markAsBusy, debounce } from "../util"
import { PageView, type PageViewDelegate } from "./drive/page_view"
import { FrameElement } from "../elements/frame_element"
import { Preloader, type PreloaderDelegate } from "./drive/preloader"
import { Cache } from "./cache"
import { config } from "./config"
import type { Adapter } from "./native/adapter"
import type { PageSnapshot } from "./drive/page_snapshot"
import type { ViewRenderOptions } from "./view"
import type { RenderMethod } from "./renderer"
import type { FetchResponse } from "../http/fetch_response"
import type { LimitedSet } from "./drive/limited_set"
import type { FormMode } from "./config/forms"
import type { Action, Position, ReloadReason, StreamSource } from "./types"
import type {
  TurboBeforeCacheEvent,
  TurboBeforeRenderEvent,
  TurboBeforeVisitEvent,
  TurboClickEvent,
  TurboFrameLoadEvent,
  TurboFrameRenderEvent,
  TurboLoadEvent,
  TurboRenderEvent,
  TurboVisitEvent
} from "./events"

/** Options for `session.refresh`, as read from a <turbo-stream action="refresh"> element. */
export type StreamRefreshOptions = { method?: string | null; requestId?: string | null; scroll?: string | null }

export class Session
  implements
    BrowserAdapterSession,
    FormLinkClickObserverDelegate,
    FormSubmitObserverDelegate,
    FrameRedirectorSession,
    HistoryDelegate,
    LinkClickObserverDelegate,
    LinkPrefetchObserverDelegate,
    NavigatorDelegate,
    PageObserverDelegate,
    PageViewDelegate,
    PreloaderDelegate,
    ScrollObserverDelegate,
    StreamObserverDelegate
{
  readonly navigator = new Navigator(this)
  readonly history = new History(this)
  readonly view = new PageView(this, document.documentElement as HTMLBodyElement) // TODO(types): PageView wraps <html>, not <body>
  adapter: Adapter = new BrowserAdapter(this)

  readonly pageObserver = new PageObserver(this)
  readonly cacheObserver = new CacheObserver()
  readonly linkPrefetchObserver = new LinkPrefetchObserver(this, document)
  readonly linkClickObserver = new LinkClickObserver(this, window)
  readonly formSubmitObserver = new FormSubmitObserver(this, document)
  readonly scrollObserver = new ScrollObserver(this)
  readonly streamObserver = new StreamObserver(this)
  readonly formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement)
  readonly frameRedirector = new FrameRedirector(this, document.documentElement)
  readonly streamMessageRenderer = new StreamMessageRenderer()
  readonly cache = new Cache(this)

  enabled = true
  started = false
  #pageRefreshDebouncePeriod = 150

  declare readonly recentRequests: LimitedSet<string>
  declare readonly preloader: Preloader
  declare debouncedRefresh: (url: string, options?: StreamRefreshOptions | string) => void

  constructor(recentRequests: LimitedSet<string>) {
    this.recentRequests = recentRequests
    this.preloader = new Preloader(this, this.view.snapshotCache)
    this.debouncedRefresh = this.refresh
    this.pageRefreshDebouncePeriod = this.pageRefreshDebouncePeriod
  }

  start(): void {
    if (!this.started) {
      this.pageObserver.start()
      this.cacheObserver.start()
      this.linkPrefetchObserver.start()
      this.formLinkClickObserver.start()
      this.linkClickObserver.start()
      this.formSubmitObserver.start()
      this.scrollObserver.start()
      this.streamObserver.start()
      this.frameRedirector.start()
      this.history.start()
      this.preloader.start()
      this.started = true
      this.enabled = true
    }
  }

  disable(): void {
    this.enabled = false
  }

  stop(): void {
    if (this.started) {
      this.pageObserver.stop()
      this.cacheObserver.stop()
      this.linkPrefetchObserver.stop()
      this.formLinkClickObserver.stop()
      this.linkClickObserver.stop()
      this.formSubmitObserver.stop()
      this.scrollObserver.stop()
      this.streamObserver.stop()
      this.frameRedirector.stop()
      this.history.stop()
      this.preloader.stop()
      this.started = false
    }
  }

  registerAdapter(adapter: Adapter): void {
    this.adapter = adapter
  }

  visit(location: Locatable, options: Partial<VisitOptions> = {}): void {
    const frameElement = options.frame ? document.getElementById(options.frame) : null

    if (frameElement instanceof FrameElement) {
      const action = options.action || getVisitAction(frameElement)

      frameElement.delegate.proposeVisitIfNavigatedWithAction(frameElement, action)
      frameElement.src = location.toString()
    } else {
      this.navigator.proposeVisit(expandURL(location), options)
    }
  }

  refresh(url: string, options: StreamRefreshOptions | string = {}): void {
    options = typeof options === "string" ? { requestId: options } : options

    const { method, requestId, scroll } = options
    const isRecentRequest = requestId && this.recentRequests.has(requestId)
    const isCurrentUrl = url === document.baseURI
    if (!isRecentRequest && !this.navigator.currentVisit && !this.navigator.isFormSubmissionInFlight && isCurrentUrl) {
      // TODO(types): attribute values from <turbo-stream action="refresh"> are passed through
      // unvalidated, so method and scroll can be any string at runtime.

      this.visit(url, { action: "replace", shouldCacheSnapshot: false, refresh: { method, scroll } as VisitRefreshOptions })
    }
  }

  connectStreamSource(source: StreamSource): void {
    this.streamObserver.connectStreamSource(source)
  }

  disconnectStreamSource(source: StreamSource): void {
    this.streamObserver.disconnectStreamSource(source)
  }

  renderStreamMessage(message: StreamMessage | string): void {
    this.streamMessageRenderer.render(StreamMessage.wrap(message))
  }

  clearCache(): void {
    this.view.clearSnapshotCache()
  }

  setProgressBarDelay(delay: number): void {
    console.warn(
      "Please replace `session.setProgressBarDelay(delay)` with `session.progressBarDelay = delay`. The function is deprecated and will be removed in a future version of Turbo.`"
    )

    this.progressBarDelay = delay
  }

  set progressBarDelay(delay: number) {
    config.drive.progressBarDelay = delay
  }

  get progressBarDelay(): number {
    return config.drive.progressBarDelay
  }

  set drive(value: boolean) {
    config.drive.enabled = value
  }

  get drive(): boolean {
    return config.drive.enabled
  }

  set formMode(value: FormMode) {
    config.forms.mode = value
  }

  get formMode(): FormMode {
    return config.forms.mode
  }

  get location(): URL {
    return this.history.location
  }

  get restorationIdentifier(): string {
    return this.history.restorationIdentifier
  }

  get pageRefreshDebouncePeriod(): number {
    return this.#pageRefreshDebouncePeriod
  }

  set pageRefreshDebouncePeriod(value: number) {
    this.refresh = debounce(this.debouncedRefresh.bind(this), value)
    this.#pageRefreshDebouncePeriod = value
  }

  // Preloader delegate

  shouldPreloadLink(element: HTMLAnchorElement): boolean {
    const isUnsafe = element.hasAttribute("data-turbo-method")
    const isStream = element.hasAttribute("data-turbo-stream")
    const frameTarget = element.getAttribute("data-turbo-frame")
    const frame = frameTarget == "_top" ?
      null :
      document.getElementById(frameTarget!) || findClosestRecursively(element, "turbo-frame:not([disabled])")

    if (isUnsafe || isStream || frame instanceof FrameElement) {
      return false
    } else {
      const location = new URL(element.href)

      return this.elementIsNavigatable(element) && locationIsVisitable(location, this.snapshot.rootLocation)
    }
  }

  // History delegate

  historyPoppedToLocationWithRestorationIdentifierAndDirection(
    location: URL,
    restorationIdentifier: string,
    direction: VisitDirection,
    isSameDocument = false
  ): void {
    // Pending visits must keep the normal cancellation and render ordering.
    if (isSameDocument && this.navigator.currentVisit?.state !== VisitState.started) {
      this.view.lastRenderedLocation = location
      const { scrollPosition } = this.history.getRestorationDataForIdentifier(restorationIdentifier)
      if (scrollPosition) {
        this.view.scrollToPosition(scrollPosition)
      } else {
        this.view.scrollToAnchorFromLocation(location)
      }
    } else if (this.enabled) {
      this.navigator.startVisit(location, restorationIdentifier, {
        action: "restore",
        historyChanged: true,
        direction
      })
    } else {
      this.adapter.pageInvalidated({
        reason: "turbo_disabled"
      })
    }
  }

  historyPoppedWithEmptyState(location: URL): void {
    if (this.history.entryDocumentIdentifier === this.history.renderedDocumentIdentifier) {
      this.view.lastRenderedLocation = location
    }
  }

  // Scroll observer delegate

  scrollPositionChanged(position: Position): void {
    this.history.updateRestorationData({ scrollPosition: position })
  }

  // Form click observer delegate

  willSubmitFormLinkToLocation(link: Element, location: URL): boolean {
    return this.elementIsNavigatable(link) && locationIsVisitable(location, this.snapshot.rootLocation)
  }

  submittedFormLinkToLocation(): void {}

  // Link hover observer delegate

  canPrefetchRequestToLocation(link: Element, location: URL): boolean {
    return (
      this.elementIsNavigatable(link) &&
      locationIsVisitable(location, this.snapshot.rootLocation) &&
      this.navigator.linkPrefetchingIsEnabledForLocation(location)
    )
  }

  // Link click observer delegate

  willFollowLinkToLocation(link: Element, location: URL, event: MouseEvent): boolean {
    return (
      this.elementIsNavigatable(link) &&
      locationIsVisitable(location, this.snapshot.rootLocation) &&
      this.applicationAllowsFollowingLinkToLocation(link, location, event)
    )
  }

  followedLinkToLocation(link: Element, location: URL): void {
    const action = this.getActionForLink(link)
    const acceptsStreamResponse = link.hasAttribute("data-turbo-stream")

    this.visit(location.href, { action, acceptsStreamResponse })
  }

  // Navigator delegate

  allowsVisitingLocationWithAction(location: URL, _action?: Action): boolean {
    return this.applicationAllowsVisitingLocation(location)
  }

  visitProposedToLocation(location: URL, options: Partial<VisitOptions>): void {
    extendURLWithDeprecatedProperties(location)
    this.adapter.visitProposedToLocation(location, options)
  }

  // Visit delegate

  visitStarted(visit: Visit): void {
    if (!visit.acceptsStreamResponse) {
      markAsBusy(document.documentElement)
      this.view.markVisitDirection(visit.direction)
    }
    extendURLWithDeprecatedProperties(visit.location)
    this.notifyApplicationAfterVisitingLocation(visit.location, visit.action)
  }

  visitCompleted(visit: Visit): void {
    this.view.unmarkVisitDirection()
    clearBusyState(document.documentElement)
    this.notifyApplicationAfterPageLoad(visit.getTimingMetrics())
  }

  // Form submit observer delegate

  willSubmitForm(form: HTMLFormElement, submitter?: HTMLElement): boolean {
    const action = getAction(form, submitter)

    return (
      this.submissionIsNavigatable(form, submitter) &&
      locationIsVisitable(expandURL(action), this.snapshot.rootLocation)
    )
  }

  formSubmitted(form: HTMLFormElement, submitter?: HTMLElement): void {
    this.navigator.submitForm(form, submitter)
  }

  // Page observer delegate

  pageBecameInteractive(): void {
    this.view.lastRenderedLocation = this.location
    this.notifyApplicationAfterPageLoad()
  }

  pageLoaded(): void {
    this.history.assumeControlOfScrollRestoration()
  }

  pageWillUnload(): void {
    this.history.relinquishControlOfScrollRestoration()
  }

  // Stream observer delegate

  receivedMessageFromStream(message: StreamMessage): void {
    this.renderStreamMessage(message)
  }

  // Page view delegate

  viewWillCacheSnapshot(): void {
    this.notifyApplicationBeforeCachingSnapshot()
  }

  allowsImmediateRender({ element }: PageSnapshot, options: ViewRenderOptions<HTMLBodyElement>): boolean {
    const event = this.notifyApplicationBeforeRender(element, options)
    const {
      defaultPrevented,
      detail: { render }
    } = event

    if (this.view.renderer && render) {
      this.view.renderer.renderElement = render
    }

    return !defaultPrevented
  }

  viewRenderedSnapshot(_snapshot: PageSnapshot, _isPreview: boolean, renderMethod: RenderMethod): void {
    this.view.lastRenderedLocation = this.history.location
    this.notifyApplicationAfterRender(renderMethod)
  }

  preloadOnLoadLinksForView(element: Element): void {
    this.preloader.preloadOnLoadLinksForView(element)
  }

  viewInvalidated(reason: ReloadReason): void {
    this.adapter.pageInvalidated(reason)
  }

  // Frame element

  frameLoaded(frame: FrameElement): void {
    this.notifyApplicationAfterFrameLoad(frame)
  }

  frameRendered(fetchResponse: FetchResponse, frame: FrameElement): void {
    this.notifyApplicationAfterFrameRender(fetchResponse, frame)
  }

  // Application events

  applicationAllowsFollowingLinkToLocation(link: Element, location: URL, ev: MouseEvent): boolean {
    const event = this.notifyApplicationAfterClickingLinkToLocation(link, location, ev)
    return !event.defaultPrevented
  }

  applicationAllowsVisitingLocation(location: URL): boolean {
    const event = this.notifyApplicationBeforeVisitingLocation(location)
    return !event.defaultPrevented
  }

  notifyApplicationAfterClickingLinkToLocation(link: Element, location: URL, event: MouseEvent): TurboClickEvent {
    return dispatch("turbo:click", {
      target: link,
      detail: { url: location.href, originalEvent: event },
      cancelable: true
    })
  }

  notifyApplicationBeforeVisitingLocation(location: URL): TurboBeforeVisitEvent {
    return dispatch("turbo:before-visit", {
      detail: { url: location.href },
      cancelable: true
    })
  }

  notifyApplicationAfterVisitingLocation(location: URL, action: Action): TurboVisitEvent {
    return dispatch("turbo:visit", { detail: { url: location.href, action } })
  }

  notifyApplicationBeforeCachingSnapshot(): TurboBeforeCacheEvent {
    return dispatch("turbo:before-cache")
  }

  notifyApplicationBeforeRender(newBody: HTMLBodyElement, options: ViewRenderOptions<HTMLBodyElement>): TurboBeforeRenderEvent {
    return dispatch("turbo:before-render", {
      detail: { newBody, ...options },
      cancelable: true
    })
  }

  notifyApplicationAfterRender(renderMethod: RenderMethod): TurboRenderEvent {
    return dispatch("turbo:render", { detail: { renderMethod } })
  }

  notifyApplicationAfterPageLoad(timing: TimingMetrics = {}): TurboLoadEvent {
    return dispatch("turbo:load", {
      detail: { url: this.location.href, timing }
    })
  }

  notifyApplicationAfterFrameLoad(frame: FrameElement): TurboFrameLoadEvent {
    return dispatch("turbo:frame-load", { target: frame })
  }

  notifyApplicationAfterFrameRender(fetchResponse: FetchResponse, frame: FrameElement): TurboFrameRenderEvent {
    return dispatch("turbo:frame-render", {
      detail: { fetchResponse },
      target: frame,
      cancelable: true
    })
  }

  // Helpers

  submissionIsNavigatable(form: HTMLFormElement, submitter?: HTMLElement): boolean {
    if (config.forms.mode == "off") {
      return false
    } else {
      const submitterIsNavigatable = this.submitterIsNavigatable(submitter)

      if (config.forms.mode == "optin") {
        return submitterIsNavigatable && form.closest('[data-turbo="true"]') != null
      } else {
        return submitterIsNavigatable && this.elementIsNavigatable(form)
      }
    }
  }

  submitterIsNavigatable(submitter?: HTMLElement): boolean {
    if (!submitter) return true

    if (submitter.hasAttribute("form") && (submitter as HTMLButtonElement).form instanceof HTMLFormElement) {
      return submitter.getAttribute("data-turbo") != "false"
    }

    return this.elementIsNavigatable(submitter)
  }

  elementIsNavigatable(element: Element): boolean {
    const container = findClosestRecursively(element, "[data-turbo]")
    const withinFrame = findClosestRecursively(element, "turbo-frame")

    // Check if Drive is enabled on the session or we're within a Frame.
    if (config.drive.enabled || withinFrame) {
      // Element is navigatable by default, unless `data-turbo="false"`.
      if (container) {
        return container.getAttribute("data-turbo") != "false"
      } else {
        return true
      }
    } else {
      // Element isn't navigatable by default, unless `data-turbo="true"`.
      if (container) {
        return container.getAttribute("data-turbo") == "true"
      } else {
        return false
      }
    }
  }

  // Private

  getActionForLink(link: Element): Action {
    return getVisitAction(link) || "advance"
  }

  get snapshot(): PageSnapshot {
    return this.view.snapshot
  }
}

// Older versions of the Turbo Native adapters referenced the
// `Location#absoluteURL` property in their implementations of
// the `Adapter#visitProposedToLocation()` and `#visitStarted()`
// methods. The Location class has since been removed in favor
// of the DOM URL API, and accordingly all Adapter methods now
// receive URL objects.
//
// We alias #absoluteURL to #toString() here to avoid crashing
// older adapters which do not expect URL objects. We should
// consider removing this support at some point in the future.

function extendURLWithDeprecatedProperties(url: URL): void {
  Object.defineProperties(url, deprecatedLocationPropertyDescriptors)
}

const deprecatedLocationPropertyDescriptors: PropertyDescriptorMap = {
  absoluteURL: {
    get(this: URL) {
      return this.toString()
    }
  }
}
