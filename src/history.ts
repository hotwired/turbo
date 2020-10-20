import { Location } from "./location"
import { Position } from "./types"
import { defer, uuid } from "./util"

export interface HistoryDelegate {
  historyPoppedToLocationWithRestorationIdentifier(location: Location, restorationIdentifier: string): void
}

type HistoryMethod = (this: typeof history, state: any, title: string, url?: string | null | undefined) => void

export type RestorationData = { scrollPosition?: Position }

export type RestorationDataMap = { [restorationIdentifier: string]: RestorationData }

export class History {
  readonly delegate: HistoryDelegate
  location!: Location
  restorationIdentifier!: string
  restorationData: RestorationDataMap = {}
  started = false
  pageLoaded = false
  previousScrollRestoration?: ScrollRestoration

  constructor(delegate: HistoryDelegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      this.previousScrollRestoration = history.scrollRestoration
      history.scrollRestoration = "manual"
      addEventListener("popstate", this.onPopState, false)
      addEventListener("load", this.onPageLoad, false)
      this.started = true
      this.replace(Location.currentLocation)
    }
  }

  stop() {
    if (this.started) {
      history.scrollRestoration = this.previousScrollRestoration ?? "auto"
      removeEventListener("popstate", this.onPopState, false)
      removeEventListener("load", this.onPageLoad, false)
      this.started = false
    }
  }

  push(location: Location, restorationIdentifier?: string) {
    this.update(history.pushState, location, restorationIdentifier)
  }

  replace(location: Location, restorationIdentifier?: string) {
    this.update(history.replaceState, location, restorationIdentifier)
  }

  update(method: HistoryMethod, location: Location, restorationIdentifier = uuid()) {
    const state = { turbolinks: { restorationIdentifier } }
    method.call(history, state, "", location.absoluteURL)
    this.location = location
    this.restorationIdentifier = restorationIdentifier
  }

  // Restoration data

  getRestorationDataForIdentifier(restorationIdentifier: string): RestorationData {
    return this.restorationData[restorationIdentifier] || {}
  }

  updateRestorationData(additionalData: Partial<RestorationData>) {
    const { restorationIdentifier } = this
    const restorationData = this.restorationData[restorationIdentifier]
    this.restorationData[restorationIdentifier] = { ...restorationData, ...additionalData }
  }

  // Event handlers

  onPopState = (event: PopStateEvent) => {
    if (this.shouldHandlePopState()) {
      const { turbolinks } = event.state || {}
      if (turbolinks) {
        const location = Location.currentLocation
        this.location = location
        const { restorationIdentifier } = turbolinks
        this.restorationIdentifier = restorationIdentifier
        this.delegate.historyPoppedToLocationWithRestorationIdentifier(location, restorationIdentifier)
      }
    }
  }

  onPageLoad = (event: Event) => {
    defer(() => {
      this.pageLoaded = true
    })
  }

  // Private

  shouldHandlePopState() {
    // Safari dispatches a popstate event after window's load event, ignore it
    return this.pageIsLoaded()
  }

  pageIsLoaded() {
    return this.pageLoaded || document.readyState == "complete"
  }
}
