import { BrowserAdapter } from "./native/browser_adapter"
import { CacheObserver } from "../observers/cache_observer"
import { FormSubmitObserver } from "../observers/form_submit_observer"
import { FrameRedirector } from "./frames/frame_redirector"
import { History } from "./drive/history"
import { LinkPrefetchObserver } from "../observers/link_prefetch_observer"
import { LinkClickObserver } from "../observers/link_click_observer"
import { FormLinkClickObserver } from "../observers/form_link_click_observer"
import { getAction, expandURL, locationIsVisitable, isHashLink } from "./url"
import { Navigator } from "./drive/navigator"
import { PageObserver } from "../observers/page_observer"
import { ScrollObserver } from "../observers/scroll_observer"
import { StreamMessage } from "./streams/stream_message"
import { StreamMessageRenderer } from "./streams/stream_message_renderer"
import { StreamObserver } from "../observers/stream_observer"
import { clearBusyState, dispatch, findClosestRecursively, getVisitAction, markAsBusy, debounce } from "../util"
import { PageView } from "./drive/page_view"
import { FrameElement } from "../elements/frame_element"
import { Preloader } from "./drive/preloader"
import { Cache } from "./cache"
import { config } from "./config"

export class Session {
  navigator = new Navigator(this)
  history = new History(this)
  view = new PageView(this, document.documentElement)
  adapter = new BrowserAdapter(this)

  pageObserver = new PageObserver(this)
  cacheObserver = new CacheObserver()
  linkPrefetchObserver = new LinkPrefetchObserver(this, document)
  linkClickObserver = new LinkClickObserver(this, window)
  formSubmitObserver = new FormSubmitObserver(this, document)
  scrollObserver = new ScrollObserver(this)
  streamObserver = new StreamObserver(this)
  formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement)
  frameRedirector = new FrameRedirector(this, document.documentElement)
  streamMessageRenderer = new StreamMessageRenderer()
  cache = new Cache(this)

  enabled = true
  started = false
  #pageRefreshDebouncePeriod = 150

  constructor(recentRequests) {
    this.recentRequests = recentRequests
    this.preloader = new Preloader(this, this.view.snapshotCache)
    this.debouncedRefresh = this.refresh
    this.pageRefreshDebouncePeriod = this.pageRefreshDebouncePeriod
  }

  start() {
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

  disable() {
    this.enabled = false
  }

  stop() {
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

  registerAdapter(adapter) {
    this.adapter = adapter
  }

  visit(location, options = {}) {
    const frameElement = options.frame ? document.getElementById(options.frame) : null

    if (frameElement instanceof FrameElement) {
      const action = options.action || getVisitAction(frameElement)

      frameElement.delegate.proposeVisitIfNavigatedWithAction(frameElement, action)
      frameElement.src = location.toString()
    } else {
      this.navigator.proposeVisit(expandURL(location), options)
    }
  }

  refresh(url, options = {}) {
    options = typeof options === "string" ? { requestId: options } : options

    const { method, requestId, scroll } = options
    const isRecentRequest = requestId && this.recentRequests.has(requestId)
    const isCurrentUrl = url === document.baseURI
    if (!isRecentRequest && !this.navigator.currentVisit && isCurrentUrl) {
      this.visit(url, { action: "replace", shouldCacheSnapshot: false, refresh: { method, scroll } })
    }
  }

  connectStreamSource(source) {
    this.streamObserver.connectStreamSource(source)
  }

  disconnectStreamSource(source) {
    this.streamObserver.disconnectStreamSource(source)
  }

  renderStreamMessage(message) {
    this.streamMessageRenderer.render(StreamMessage.wrap(message))
  }

  clearCache() {
    this.view.clearSnapshotCache()
  }

  setProgressBarDelay(delay) {
    console.warn(
      "Please replace `session.setProgressBarDelay(delay)` with `session.progressBarDelay = delay`. The function is deprecated and will be removed in a future version of Turbo.`"
    )

    this.progressBarDelay = delay
  }

  set progressBarDelay(delay) {
    config.drive.progressBarDelay = delay
  }

  get progressBarDelay() {
    return config.drive.progressBarDelay
  }

  set drive(value) {
    config.drive.enabled = value
  }

  get drive() {
    return config.drive.enabled
  }

  set formMode(value) {
    config.forms.mode = value
  }

  get formMode() {
    return config.forms.mode
  }

  get location() {
    return this.history.location
  }

  get restorationIdentifier() {
    return this.history.restorationIdentifier
  }

  get pageRefreshDebouncePeriod() {
    return this.#pageRefreshDebouncePeriod
  }

  set pageRefreshDebouncePeriod(value) {
    this.refresh = debounce(this.debouncedRefresh.bind(this), value)
    this.#pageRefreshDebouncePeriod = value
  }

  // Preloader delegate

  shouldPreloadLink(element) {
    const isUnsafe = element.hasAttribute("data-turbo-method")
    const isStream = element.hasAttribute("data-turbo-stream")
    const frameTarget = element.getAttribute("data-turbo-frame")
    const frame = frameTarget == "_top" ?
      null :
      document.getElementById(frameTarget) || findClosestRecursively(element, "turbo-frame:not([disabled])")

    if (isUnsafe || isStream || frame instanceof FrameElement) {
      return false
    } else {
      const location = new URL(element.href)

      return this.elementIsNavigatable(element) && locationIsVisitable(location, this.snapshot.rootLocation)
    }
  }

  // History delegate

  historyPoppedToLocationWithRestorationIdentifierAndDirection(location, restorationIdentifier, direction) {
    if (this.enabled) {
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

  historyPoppedWithEmptyState(location) {
    this.history.replace(location)
    this.view.lastRenderedLocation = location
    this.view.cacheSnapshot()
  }

  // Scroll observer delegate

  scrollPositionChanged(position) {
    this.history.updateRestorationData({ scrollPosition: position })
  }

  // Form click observer delegate

  willSubmitFormLinkToLocation(link, location) {
    return this.elementIsNavigatable(link) && locationIsVisitable(location, this.snapshot.rootLocation)
  }

  submittedFormLinkToLocation() {}

  // Link hover observer delegate

  canPrefetchRequestToLocation(link, location) {
    return (
      this.elementIsNavigatable(link) &&
      locationIsVisitable(location, this.snapshot.rootLocation) &&
      this.navigator.linkPrefetchingIsEnabledForLocation(location)
    )
  }

  // Link click observer delegate

  willFollowLinkToLocation(link, location, event) {
    return (
      this.elementIsNavigatable(link) &&
      locationIsVisitable(location, this.snapshot.rootLocation) &&
      !isHashLink(link) &&
      this.applicationAllowsFollowingLinkToLocation(link, location, event)
    )
  }

  followedLinkToLocation(link, location) {
    const action = this.getActionForLink(link)
    const acceptsStreamResponse = link.hasAttribute("data-turbo-stream")

    this.visit(location.href, { action, acceptsStreamResponse })
  }

  // Navigator delegate

  allowsVisitingLocationWithAction(location, action) {
    return this.applicationAllowsVisitingLocation(location)
  }

  visitProposedToLocation(location, options) {
    extendURLWithDeprecatedProperties(location)
    this.adapter.visitProposedToLocation(location, options)
  }

  // Visit delegate

  visitStarted(visit) {
    if (!visit.acceptsStreamResponse) {
      markAsBusy(document.documentElement)
      this.view.markVisitDirection(visit.direction)
    }
    extendURLWithDeprecatedProperties(visit.location)
    this.notifyApplicationAfterVisitingLocation(visit.location, visit.action)
  }

  visitCompleted(visit) {
    this.view.unmarkVisitDirection()
    clearBusyState(document.documentElement)
    this.notifyApplicationAfterPageLoad(visit.getTimingMetrics())
  }

  // Form submit observer delegate

  willSubmitForm(form, submitter) {
    const action = getAction(form, submitter)

    return (
      this.submissionIsNavigatable(form, submitter) &&
      locationIsVisitable(expandURL(action), this.snapshot.rootLocation)
    )
  }

  formSubmitted(form, submitter) {
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

  receivedMessageFromStream(message) {
    this.renderStreamMessage(message)
  }

  // Page view delegate

  viewWillCacheSnapshot() {
    this.notifyApplicationBeforeCachingSnapshot()
  }

  allowsImmediateRender({ element }, options) {
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

  viewRenderedSnapshot(_snapshot, _isPreview, renderMethod) {
    this.view.lastRenderedLocation = this.history.location
    this.notifyApplicationAfterRender(renderMethod)
  }

  preloadOnLoadLinksForView(element) {
    this.preloader.preloadOnLoadLinksForView(element)
  }

  viewInvalidated(reason) {
    this.adapter.pageInvalidated(reason)
  }

  // Frame element

  frameLoaded(frame) {
    this.notifyApplicationAfterFrameLoad(frame)
  }

  frameRendered(fetchResponse, frame) {
    this.notifyApplicationAfterFrameRender(fetchResponse, frame)
  }

  // Application events

  applicationAllowsFollowingLinkToLocation(link, location, ev) {
    const event = this.notifyApplicationAfterClickingLinkToLocation(link, location, ev)
    return !event.defaultPrevented
  }

  applicationAllowsVisitingLocation(location) {
    const event = this.notifyApplicationBeforeVisitingLocation(location)
    return !event.defaultPrevented
  }

  notifyApplicationAfterClickingLinkToLocation(link, location, event) {
    return dispatch("turbo:click", {
      target: link,
      detail: { url: location.href, originalEvent: event },
      cancelable: true
    })
  }

  notifyApplicationBeforeVisitingLocation(location) {
    return dispatch("turbo:before-visit", {
      detail: { url: location.href },
      cancelable: true
    })
  }

  notifyApplicationAfterVisitingLocation(location, action) {
    return dispatch("turbo:visit", { detail: { url: location.href, action } })
  }

  notifyApplicationBeforeCachingSnapshot() {
    return dispatch("turbo:before-cache")
  }

  notifyApplicationBeforeRender(newBody, options) {
    return dispatch("turbo:before-render", {
      detail: { newBody, ...options },
      cancelable: true
    })
  }

  notifyApplicationAfterRender(renderMethod) {
    return dispatch("turbo:render", { detail: { renderMethod } })
  }

  notifyApplicationAfterPageLoad(timing = {}) {
    return dispatch("turbo:load", {
      detail: { url: this.location.href, timing }
    })
  }

  notifyApplicationAfterFrameLoad(frame) {
    return dispatch("turbo:frame-load", { target: frame })
  }

  notifyApplicationAfterFrameRender(fetchResponse, frame) {
    return dispatch("turbo:frame-render", {
      detail: { fetchResponse },
      target: frame,
      cancelable: true
    })
  }

  // Helpers

  submissionIsNavigatable(form, submitter) {
    if (config.forms.mode == "off") {
      return false
    } else {
      const submitterIsNavigatable = submitter ? this.elementIsNavigatable(submitter) : true

      if (config.forms.mode == "optin") {
        return submitterIsNavigatable && form.closest('[data-turbo="true"]') != null
      } else {
        return submitterIsNavigatable && this.elementIsNavigatable(form)
      }
    }
  }

  elementIsNavigatable(element) {
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

  getActionForLink(link) {
    return getVisitAction(link) || "advance"
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

function extendURLWithDeprecatedProperties(url) {
  Object.defineProperties(url, deprecatedLocationPropertyDescriptors)
}

const deprecatedLocationPropertyDescriptors = {
  absoluteURL: {
    get() {
      return this.toString()
    }
  }
}
