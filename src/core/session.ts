import { Adapter } from "./native/adapter"
import { BrowserAdapter, ReloadReason } from "./native/browser_adapter"
import { CacheObserver } from "../observers/cache_observer"
import { FormSubmitObserver, FormSubmitObserverDelegate } from "../observers/form_submit_observer"
import { FrameRedirector } from "./frames/frame_redirector"
import { History, HistoryDelegate } from "./drive/history"
import { LinkClickObserver, LinkClickObserverDelegate } from "../observers/link_click_observer"
import { FormLinkClickObserver, FormLinkClickObserverDelegate } from "../observers/form_link_click_observer"
import { getAction, expandURL, locationIsVisitable, Locatable } from "./url"
import { Navigator, NavigatorDelegate } from "./drive/navigator"
import { PageObserver, PageObserverDelegate } from "../observers/page_observer"
import { ScrollObserver } from "../observers/scroll_observer"
import { StreamMessage } from "./streams/stream_message"
import { StreamObserver } from "../observers/stream_observer"
import { Action, Position, StreamSource, isAction } from "./types"
import { clearBusyState, dispatch, markAsBusy } from "../util"
import { PageView, PageViewDelegate, PageViewRenderOptions } from "./drive/page_view"
import { Visit, VisitOptions } from "./drive/visit"
import { PageSnapshot } from "./drive/page_snapshot"
import { FrameElement } from "../elements/frame_element"
import { FrameViewRenderOptions } from "./frames/frame_view"
import { FetchResponse } from "../http/fetch_response"
import { Preloader, PreloaderDelegate } from "./drive/preloader"
import { FetchRequest } from "../http/fetch_request"

export type FormMode = "on" | "off" | "optin"
export type TimingData = unknown
export type TurboBeforeCacheEvent = CustomEvent
export type TurboBeforeRenderEvent = CustomEvent<{ newBody: HTMLBodyElement } & PageViewRenderOptions>
export type TurboBeforeVisitEvent = CustomEvent<{ url: string }>
export type TurboClickEvent = CustomEvent<{ url: string; originalEvent: MouseEvent }>
export type TurboFrameLoadEvent = CustomEvent
export type TurboBeforeFrameRenderEvent = CustomEvent<{ newFrame: FrameElement } & FrameViewRenderOptions>
export type TurboFetchRequestErrorEvent = CustomEvent<{ request: FetchRequest; error: Error }>
export type TurboFrameRenderEvent = CustomEvent<{ fetchResponse: FetchResponse }>
export type TurboLoadEvent = CustomEvent<{ url: string; timing: TimingData }>
export type TurboRenderEvent = CustomEvent
export type TurboVisitEvent = CustomEvent<{ url: string; action: Action }>

export class Session
  implements
    FormSubmitObserverDelegate,
    HistoryDelegate,
    FormLinkClickObserverDelegate,
    LinkClickObserverDelegate,
    NavigatorDelegate,
    PageObserverDelegate,
    PageViewDelegate,
    PreloaderDelegate
{
  readonly navigator = new Navigator(this)
  readonly history = new History(this)
  readonly preloader = new Preloader(this)
  readonly view = new PageView(this, document.documentElement as HTMLBodyElement)
  adapter: Adapter = new BrowserAdapter(this)

  readonly pageObserver = new PageObserver(this)
  readonly cacheObserver = new CacheObserver()
  readonly linkClickObserver = new LinkClickObserver(this, window)
  readonly formSubmitObserver = new FormSubmitObserver(this, document)
  readonly scrollObserver = new ScrollObserver(this)
  readonly streamObserver = new StreamObserver(this)
  readonly formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement)
  readonly frameRedirector = new FrameRedirector(this, document.documentElement)

  drive = true
  enabled = true
  progressBarDelay = 500
  started = false
  formMode: FormMode = "on"

  start() {
    if (!this.started) {
      this.pageObserver.start()
      this.cacheObserver.start()
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

  disable() {
    this.enabled = false
  }

  stop() {
    if (this.started) {
      this.pageObserver.stop()
      this.cacheObserver.stop()
      this.formLinkClickObserver.stop()
      this.linkClickObserver.stop()
      this.formSubmitObserver.stop()
      this.scrollObserver.stop()
      this.streamObserver.stop()
      this.frameRedirector.stop()
      this.history.stop()
      this.started = false
    }
  }

  registerAdapter(adapter: Adapter) {
    this.adapter = adapter
  }

  visit(location: Locatable, options: Partial<VisitOptions> = {}): Promise<void> {
    const frameElement = options.frame ? document.getElementById(options.frame) : null

    if (frameElement instanceof FrameElement) {
      frameElement.src = location.toString()
      return frameElement.loaded
    } else {
      return this.navigator.proposeVisit(expandURL(location), options)
    }
  }

  connectStreamSource(source: StreamSource) {
    this.streamObserver.connectStreamSource(source)
  }

  disconnectStreamSource(source: StreamSource) {
    this.streamObserver.disconnectStreamSource(source)
  }

  renderStreamMessage(message: StreamMessage | string) {
    document.documentElement.appendChild(StreamMessage.wrap(message).fragment)
  }

  clearCache() {
    this.view.clearSnapshotCache()
  }

  setProgressBarDelay(delay: number) {
    this.progressBarDelay = delay
  }

  setFormMode(mode: FormMode) {
    this.formMode = mode
  }

  get location() {
    return this.history.location
  }

  get restorationIdentifier() {
    return this.history.restorationIdentifier
  }

  // History delegate

  historyPoppedToLocationWithRestorationIdentifier(location: URL, restorationIdentifier: string) {
    if (this.enabled) {
      this.navigator.startVisit(location, restorationIdentifier, {
        action: "restore",
        historyChanged: true,
      })
    } else {
      this.adapter.pageInvalidated({
        reason: "turbo_disabled",
      })
    }
  }

  // Scroll observer delegate

  scrollPositionChanged(position: Position) {
    this.history.updateRestorationData({ scrollPosition: position })
  }

  // Form click observer delegate

  willSubmitFormLinkToLocation(link: Element, location: URL): boolean {
    return this.elementIsNavigatable(link) && locationIsVisitable(location, this.snapshot.rootLocation)
  }

  submittedFormLinkToLocation() {}

  // Link click observer delegate

  willFollowLinkToLocation(link: Element, location: URL, event: MouseEvent) {
    return (
      this.elementIsNavigatable(link) &&
      locationIsVisitable(location, this.snapshot.rootLocation) &&
      this.applicationAllowsFollowingLinkToLocation(link, location, event)
    )
  }

  followedLinkToLocation(link: Element, location: URL) {
    const action = this.getActionForLink(link)
    const acceptsStreamResponse = link.hasAttribute("data-turbo-stream")

    this.visit(location.href, { action, acceptsStreamResponse, initiator: link })
  }

  // Navigator delegate

  allowsVisitingLocation(location: URL, options: Partial<VisitOptions> = {}) {
    return (
      this.locationWithActionIsSamePage(location, options.action) ||
      this.applicationAllowsVisitingLocation(location, options)
    )
  }

  visitProposedToLocation(location: URL, options: Partial<VisitOptions>) {
    extendURLWithDeprecatedProperties(location)
    return this.adapter.visitProposedToLocation(location, options)
  }

  visitStarted(visit: Visit) {
    if (!visit.acceptsStreamResponse) {
      markAsBusy(document.documentElement)
    }
    extendURLWithDeprecatedProperties(visit.location)
    if (!visit.silent) {
      this.notifyApplicationAfterVisitingLocation(visit.location, visit.action, visit.initiator)
    }
  }

  visitCompleted(visit: Visit) {
    clearBusyState(document.documentElement)
    this.notifyApplicationAfterPageLoad(visit.getTimingMetrics())
  }

  locationWithActionIsSamePage(location: URL, action?: Action): boolean {
    return this.navigator.locationWithActionIsSamePage(location, action)
  }

  visitScrolledToSamePageLocation(oldURL: URL, newURL: URL) {
    this.notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL)
  }

  // Form submit observer delegate

  willSubmitForm(form: HTMLFormElement, submitter?: HTMLElement): boolean {
    const action = getAction(form, submitter)

    return (
      this.submissionIsNavigatable(form, submitter) &&
      locationIsVisitable(expandURL(action), this.snapshot.rootLocation)
    )
  }

  formSubmitted(form: HTMLFormElement, submitter?: HTMLElement) {
    this.navigator.submitForm(form, submitter)
  }

  // Page observer delegate

  pageBecameInteractive() {
    this.view.lastRenderedLocation = this.location
    this.notifyApplicationAfterPageLoad()
  }

  pageLoaded() {
    this.history.assumeControlOfScrollRestoration()
  }

  pageWillUnload() {
    this.history.relinquishControlOfScrollRestoration()
  }

  // Stream observer delegate

  receivedMessageFromStream(message: StreamMessage) {
    this.renderStreamMessage(message)
  }

  // Page view delegate

  viewWillCacheSnapshot() {
    if (!this.navigator.currentVisit?.silent) {
      this.notifyApplicationBeforeCachingSnapshot()
    }
  }

  allowsImmediateRender({ element }: PageSnapshot, options: PageViewRenderOptions) {
    const event = this.notifyApplicationBeforeRender(element, options)
    const {
      defaultPrevented,
      detail: { render },
    } = event

    if (this.view.renderer && render) {
      this.view.renderer.renderElement = render
    }

    return !defaultPrevented
  }

  viewRenderedSnapshot(_snapshot: PageSnapshot, _isPreview: boolean) {
    this.view.lastRenderedLocation = this.history.location
    this.notifyApplicationAfterRender()
  }

  preloadOnLoadLinksForView(element: Element) {
    this.preloader.preloadOnLoadLinksForView(element)
  }

  viewInvalidated(reason: ReloadReason) {
    this.adapter.pageInvalidated(reason)
  }

  // Frame element

  frameLoaded(frame: FrameElement) {
    this.notifyApplicationAfterFrameLoad(frame)
  }

  frameRendered(fetchResponse: FetchResponse, frame: FrameElement) {
    this.notifyApplicationAfterFrameRender(fetchResponse, frame)
  }

  // Application events

  applicationAllowsFollowingLinkToLocation(link: Element, location: URL, ev: MouseEvent) {
    const event = this.notifyApplicationAfterClickingLinkToLocation(link, location, ev)
    return !event.defaultPrevented
  }

  applicationAllowsVisitingLocation(location: URL, options: Partial<VisitOptions> = {}) {
    const event = this.notifyApplicationBeforeVisitingLocation(location, options.initiator)
    return !event.defaultPrevented
  }

  notifyApplicationAfterClickingLinkToLocation(link: Element, location: URL, event: MouseEvent) {
    return dispatch<TurboClickEvent>("turbo:click", {
      target: link,
      detail: { url: location.href, originalEvent: event },
      cancelable: true,
    })
  }

  notifyApplicationBeforeVisitingLocation(location: URL, element?: Element) {
    return dispatch<TurboBeforeVisitEvent>("turbo:before-visit", {
      target: element,
      detail: { url: location.href },
      cancelable: true,
    })
  }

  notifyApplicationAfterVisitingLocation(location: URL, action: Action, element?: Element) {
    return dispatch<TurboVisitEvent>("turbo:visit", {
      target: element,
      detail: { url: location.href, action },
    })
  }

  notifyApplicationBeforeCachingSnapshot() {
    return dispatch<TurboBeforeCacheEvent>("turbo:before-cache")
  }

  notifyApplicationBeforeRender(newBody: HTMLBodyElement, options: PageViewRenderOptions) {
    return dispatch<TurboBeforeRenderEvent>("turbo:before-render", {
      detail: { newBody, ...options },
      cancelable: true,
    })
  }

  notifyApplicationAfterRender() {
    return dispatch<TurboRenderEvent>("turbo:render")
  }

  notifyApplicationAfterPageLoad(timing: TimingData = {}) {
    return dispatch<TurboLoadEvent>("turbo:load", {
      detail: { url: this.location.href, timing },
    })
  }

  notifyApplicationAfterVisitingSamePageLocation(oldURL: URL, newURL: URL) {
    dispatchEvent(
      new HashChangeEvent("hashchange", {
        oldURL: oldURL.toString(),
        newURL: newURL.toString(),
      })
    )
  }

  notifyApplicationAfterFrameLoad(frame: FrameElement) {
    return dispatch<TurboFrameLoadEvent>("turbo:frame-load", { target: frame })
  }

  notifyApplicationAfterFrameRender(fetchResponse: FetchResponse, frame: FrameElement) {
    return dispatch<TurboFrameRenderEvent>("turbo:frame-render", {
      detail: { fetchResponse },
      target: frame,
      cancelable: true,
    })
  }

  // Helpers

  submissionIsNavigatable(form: HTMLFormElement, submitter?: HTMLElement): boolean {
    if (this.formMode == "off") {
      return false
    } else {
      const submitterIsNavigatable = submitter ? this.elementIsNavigatable(submitter) : true

      if (this.formMode == "optin") {
        return submitterIsNavigatable && form.closest('[data-turbo="true"]') != null
      } else {
        return submitterIsNavigatable && this.elementIsNavigatable(form)
      }
    }
  }

  elementIsNavigatable(element: Element): boolean {
    const container = element.closest("[data-turbo]")
    const withinFrame = element.closest("turbo-frame")

    // Check if Drive is enabled on the session or we're within a Frame.
    if (this.drive || withinFrame) {
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
    const action = link.getAttribute("data-turbo-action")
    return isAction(action) ? action : "advance"
  }

  get snapshot() {
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

function extendURLWithDeprecatedProperties(url: URL) {
  Object.defineProperties(url, deprecatedLocationPropertyDescriptors)
}

const deprecatedLocationPropertyDescriptors = {
  absoluteURL: {
    get() {
      return this.toString()
    },
  },
}
