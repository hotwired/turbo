import { Adapter } from "./native/adapter"
import { BrowserAdapter, ReloadReason } from "./native/browser_adapter"
import { CacheObserver } from "../observers/cache_observer"
import { FormSubmitObserver, FormSubmitObserverDelegate } from "../observers/form_submit_observer"
import { FrameRedirector } from "./frames/frame_redirector"
import { History, HistoryDelegate } from "./drive/history"
import { LinkClickObserver, LinkClickObserverDelegate } from "../observers/link_click_observer"
import { getAction, expandURL, locationIsVisitable, Locatable } from "./url"
import { Navigator, NavigatorDelegate } from "./drive/navigator"
import { PageObserver, PageObserverDelegate } from "../observers/page_observer"
import { ScrollObserver } from "../observers/scroll_observer"
import { StreamMessage } from "./streams/stream_message"
import { StreamObserver } from "../observers/stream_observer"
import { Action, Position, StreamSource, isAction } from "./types"
import { clearBusyState, dispatch, markAsBusy } from "../util"
import { PageView, PageViewDelegate } from "./drive/page_view"
import { Visit, VisitOptions } from "./drive/visit"
import { PageSnapshot } from "./drive/page_snapshot"
import { FrameElement } from "../elements/frame_element"
import { FetchResponse } from "../http/fetch_response"
import { Preloader, PreloaderDelegate } from "./drive/preloader"

export type TimingData = unknown

export class Session
  implements
    FormSubmitObserverDelegate,
    HistoryDelegate,
    LinkClickObserverDelegate,
    NavigatorDelegate,
    PageObserverDelegate,
    PageViewDelegate,
    PreloaderDelegate
{
  readonly navigator = new Navigator(this)
  readonly history = new History(this)
  readonly preloader = new Preloader(this)
  readonly view = new PageView(this, document.documentElement)
  adapter: Adapter = new BrowserAdapter(this)

  readonly pageObserver = new PageObserver(this)
  readonly cacheObserver = new CacheObserver()
  readonly linkClickObserver = new LinkClickObserver(this)
  readonly formSubmitObserver = new FormSubmitObserver(this)
  readonly scrollObserver = new ScrollObserver(this)
  readonly streamObserver = new StreamObserver(this)

  readonly frameRedirector = new FrameRedirector(document.documentElement)

  drive = true
  enabled = true
  progressBarDelay = 500
  started = false
  formMode = "on"

  start() {
    if (!this.started) {
      this.pageObserver.start()
      this.cacheObserver.start()
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

  visit(location: Locatable, options: Partial<VisitOptions> = {}) {
    this.navigator.proposeVisit(expandURL(location), options)
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

  setFormMode(mode: string) {
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

  // Link click observer delegate

  willFollowLinkToLocation(link: Element, location: URL) {
    return (
      this.elementDriveEnabled(link) &&
      locationIsVisitable(location, this.snapshot.rootLocation) &&
      this.applicationAllowsFollowingLinkToLocation(link, location)
    )
  }

  followedLinkToLocation(link: Element, location: URL) {
    const action = this.getActionForLink(link)
    this.convertLinkWithMethodClickToFormSubmission(link) || this.visit(location.href, { action })
  }

  convertLinkWithMethodClickToFormSubmission(link: Element) {
    const linkMethod = link.getAttribute("data-turbo-method")

    if (linkMethod) {
      const form = document.createElement("form")
      form.method = linkMethod
      form.action = link.getAttribute("href") || "undefined"
      form.hidden = true

      if (link.hasAttribute("data-turbo-confirm")) {
        form.setAttribute("data-turbo-confirm", link.getAttribute("data-turbo-confirm")!)
      }

      const frame = this.getTargetFrameForLink(link)
      if (frame) {
        form.setAttribute("data-turbo-frame", frame)
        form.addEventListener("turbo:submit-start", () => form.remove())
      } else {
        form.addEventListener("submit", () => form.remove())
      }

      document.body.appendChild(form)
      return dispatch("submit", { cancelable: true, target: form })
    } else {
      return false
    }
  }

  // Navigator delegate

  allowsVisitingLocationWithAction(location: URL, action?: Action) {
    return this.locationWithActionIsSamePage(location, action) || this.applicationAllowsVisitingLocation(location)
  }

  visitProposedToLocation(location: URL, options: Partial<VisitOptions>) {
    extendURLWithDeprecatedProperties(location)
    this.adapter.visitProposedToLocation(location, options)
  }

  visitStarted(visit: Visit) {
    extendURLWithDeprecatedProperties(visit.location)
    if (!visit.silent) {
      this.notifyApplicationAfterVisitingLocation(visit.location, visit.action)
    }
  }

  visitCompleted(visit: Visit) {
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
      this.elementDriveEnabled(form) &&
      (!submitter || this.formElementDriveEnabled(submitter)) &&
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

  allowsImmediateRender({ element }: PageSnapshot, resume: (value: any) => void) {
    const event = this.notifyApplicationBeforeRender(element, resume)
    return !event.defaultPrevented
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

  applicationAllowsFollowingLinkToLocation(link: Element, location: URL) {
    const event = this.notifyApplicationAfterClickingLinkToLocation(link, location)
    return !event.defaultPrevented
  }

  applicationAllowsVisitingLocation(location: URL) {
    const event = this.notifyApplicationBeforeVisitingLocation(location)
    return !event.defaultPrevented
  }

  notifyApplicationAfterClickingLinkToLocation(link: Element, location: URL) {
    return dispatch("turbo:click", {
      target: link,
      detail: { url: location.href },
      cancelable: true,
    })
  }

  notifyApplicationBeforeVisitingLocation(location: URL) {
    return dispatch("turbo:before-visit", {
      detail: { url: location.href },
      cancelable: true,
    })
  }

  notifyApplicationAfterVisitingLocation(location: URL, action: Action) {
    markAsBusy(document.documentElement)
    return dispatch("turbo:visit", { detail: { url: location.href, action } })
  }

  notifyApplicationBeforeCachingSnapshot() {
    return dispatch("turbo:before-cache")
  }

  notifyApplicationBeforeRender(newBody: HTMLBodyElement, resume: (value: any) => void) {
    return dispatch("turbo:before-render", {
      detail: { newBody, resume },
      cancelable: true,
    })
  }

  notifyApplicationAfterRender() {
    return dispatch("turbo:render")
  }

  notifyApplicationAfterPageLoad(timing: TimingData = {}) {
    clearBusyState(document.documentElement)
    return dispatch("turbo:load", {
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
    return dispatch("turbo:frame-load", { target: frame })
  }

  notifyApplicationAfterFrameRender(fetchResponse: FetchResponse, frame: FrameElement) {
    return dispatch("turbo:frame-render", {
      detail: { fetchResponse },
      target: frame,
      cancelable: true,
    })
  }

  // Helpers

  formElementDriveEnabled(element?: Element) {
    if (this.formMode == "off") {
      return false
    }
    if (this.formMode == "optin") {
      const form = element?.closest("form[data-turbo]")
      return form?.getAttribute("data-turbo") == "true"
    }
    return this.elementDriveEnabled(element)
  }

  elementDriveEnabled(element?: Element) {
    const container = element?.closest("[data-turbo]")

    // Check if Drive is enabled on the session.
    if (this.drive) {
      // Drive should be enabled by default, unless `data-turbo="false"`.
      if (container) {
        return container.getAttribute("data-turbo") != "false"
      } else {
        return true
      }
    } else {
      // Drive should be disabled by default, unless `data-turbo="true"`.
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

  getTargetFrameForLink(link: Element) {
    const frame = link.getAttribute("data-turbo-frame")

    if (frame) {
      return frame
    } else {
      const container = link.closest("turbo-frame")
      if (container) {
        return container.id
      }
    }
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
