import { Adapter } from "./adapter"
import { BrowserAdapter } from "./browser_adapter"
import { FormSubmitObserver } from "./form_submit_observer"
import { History } from "./history"
import { LinkClickObserver } from "./link_click_observer"
import { Location, Locatable } from "./location"
import { Navigator, NavigationOptions } from "./navigator"
import { PageObserver } from "./page_observer"
import { ScrollObserver } from "./scroll_observer"
import { Action, Position, isAction } from "./types"
import { closest, dispatch } from "./util"
import { View } from "./view"
import { Visit } from "./visit"

export type TimingData = {}

export class Controller {
  static supported = !!(
    window.history.pushState &&
    window.requestAnimationFrame &&
    window.addEventListener
  )

  readonly navigator = new Navigator(this)
  readonly adapter: Adapter = new BrowserAdapter(this)
  readonly history = new History(this)
  readonly view = new View(this)

  readonly pageObserver = new PageObserver(this)
  readonly linkClickObserver = new LinkClickObserver(this)
  readonly formSubmitObserver = new FormSubmitObserver(this)
  readonly scrollObserver = new ScrollObserver(this)

  enabled = true
  progressBarDelay = 500
  started = false

  start() {
    if (Controller.supported && !this.started) {
      this.pageObserver.start()
      this.linkClickObserver.start()
      this.formSubmitObserver.start()
      this.scrollObserver.start()
      this.history.start()
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
      this.linkClickObserver.stop()
      this.formSubmitObserver.stop()
      this.scrollObserver.stop()
      this.history.stop()
      this.started = false
    }
  }

  clearCache() {
    this.view.clearSnapshotCache()
  }

  visit(location: Locatable, options: Partial<NavigationOptions> = {}) {
    location = Location.wrap(location)
    if (this.applicationAllowsVisitingLocation(location)) {
      if (this.locationIsVisitable(location)) {
        const action = options.action || "advance"
        this.adapter.visitProposedToLocationWithAction(location, action)
      } else {
        window.location.href = location.toString()
      }
    }
  }

  startVisitToLocationWithAction(location: Locatable, action: Action, restorationIdentifier: string) {
    if (Controller.supported) {
      this.navigator.visit(Location.wrap(location), restorationIdentifier, { action })
    } else {
      window.location.href = location.toString()
    }
  }

  setProgressBarDelay(delay: number) {
    this.progressBarDelay = delay
  }

  get location() {
    return this.history.location
  }

  get restorationIdentifier() {
    return this.history.restorationIdentifier
  }

  // History delegate

  historyPoppedToLocationWithRestorationIdentifier(location: Location, restorationIdentifier: string) {
    if (this.enabled) {
      this.navigator.visit(location, restorationIdentifier, { action: "restore", historyChanged: true })
    } else {
      this.adapter.pageInvalidated()
    }
  }

  // Scroll observer delegate

  scrollPositionChanged(position: Position) {
    this.history.updateRestorationData({ scrollPosition: position })
  }

  // Link click observer delegate

  willFollowLinkToLocation(link: Element, location: Location) {
    return this.linkIsVisitable(link)
      && this.locationIsVisitable(location)
      && this.applicationAllowsFollowingLinkToLocation(link, location)
  }

  followedLinkToLocation(link: Element, location: Location) {
    const action = this.getActionForLink(link)
    this.visit(location, { action })
  }

  // Navigator delegate

  visitStarted(visit: Visit) {
    this.notifyApplicationAfterVisitingLocation(visit.location)
  }

  visitCompleted(visit: Visit) {
    this.notifyApplicationAfterPageLoad(visit.getTimingMetrics())
  }

  // Form submit observer delegate

  willSubmitForm(form: HTMLFormElement) {
    return true
  }

  formSubmitted(form: HTMLFormElement) {
    this.navigator.submit(form)
  }

  // Page observer delegate

  pageBecameInteractive() {
    this.view.lastRenderedLocation = this.location
    this.notifyApplicationAfterPageLoad()
  }

  pageLoaded() {

  }

  pageInvalidated() {
    this.adapter.pageInvalidated()
  }

  // View delegate

  viewWillRender(newBody: HTMLBodyElement) {
    this.notifyApplicationBeforeRender(newBody)
  }

  viewRendered() {
    this.view.lastRenderedLocation = this.history.location
    this.notifyApplicationAfterRender()
  }

  viewInvalidated() {
    this.pageObserver.invalidate()
  }

  viewWillCacheSnapshot() {
    this.notifyApplicationBeforeCachingSnapshot()
  }

  // Application events

  applicationAllowsFollowingLinkToLocation(link: Element, location: Location) {
    const event = this.notifyApplicationAfterClickingLinkToLocation(link, location)
    return !event.defaultPrevented
  }

  applicationAllowsVisitingLocation(location: Location) {
    const event = this.notifyApplicationBeforeVisitingLocation(location)
    return !event.defaultPrevented
  }

  notifyApplicationAfterClickingLinkToLocation(link: Element, location: Location) {
    return dispatch("turbolinks:click", { target: link, data: { url: location.absoluteURL }, cancelable: true })
  }

  notifyApplicationBeforeVisitingLocation(location: Location) {
    return dispatch("turbolinks:before-visit", { data: { url: location.absoluteURL }, cancelable: true })
  }

  notifyApplicationAfterVisitingLocation(location: Location) {
    return dispatch("turbolinks:visit", { data: { url: location.absoluteURL } })
  }

  notifyApplicationBeforeCachingSnapshot() {
    return dispatch("turbolinks:before-cache")
  }

  notifyApplicationBeforeRender(newBody: HTMLBodyElement) {
    return dispatch("turbolinks:before-render", { data: { newBody }})
  }

  notifyApplicationAfterRender() {
    return dispatch("turbolinks:render")
  }

  notifyApplicationAfterPageLoad(timing: TimingData = {}) {
    return dispatch("turbolinks:load", { data: { url: this.location.absoluteURL, timing }})
  }

  // Private

  getActionForLink(link: Element): Action {
    const action = link.getAttribute("data-turbolinks-action")
    return isAction(action) ? action : "advance"
  }

  linkIsVisitable(link: Element) {
    const container = closest(link, "[data-turbolinks]")
    if (container) {
      return container.getAttribute("data-turbolinks") != "false"
    } else {
      return true
    }
  }

  locationIsVisitable(location: Location) {
    return location.isPrefixedBy(this.view.getRootLocation()) && location.isHTML()
  }
}
