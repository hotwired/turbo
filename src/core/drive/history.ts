import { Action, Position } from "../types"
import { nextMicrotask, uuid, getHistoryMethodForAction } from "../../util"

export interface HistoryDelegate {
  historyPoppedToLocationWithRestorationIdentifier(location: URL, restorationIdentifier: string): void
}

export type RestorationData = { scrollPosition?: Position }

export type RestorationDataMap = {
  [restorationIdentifier: string]: RestorationData
}

export class History {
  readonly delegate: HistoryDelegate
  location!: URL
  restorationIdentifier = uuid()
  restorationData: RestorationDataMap = {}
  started = false
  pageLoaded = false
  previousScrollRestoration?: ScrollRestoration

  constructor(delegate: HistoryDelegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      addEventListener("popstate", this.onPopState, false)
      addEventListener("load", this.onPageLoad, false)
      this.started = true
      this.replace(new URL(window.location.href))
    }
  }

  stop() {
    if (this.started) {
      removeEventListener("popstate", this.onPopState, false)
      removeEventListener("load", this.onPageLoad, false)
      this.started = false
    }
  }

  push(location: URL, restorationIdentifier?: string) {
    this.update("advance", location, restorationIdentifier)
  }

  replace(location: URL, restorationIdentifier?: string) {
    this.update("replace", location, restorationIdentifier)
  }

  update(action: Action, location: URL, restorationIdentifier = uuid()) {
    const method = getHistoryMethodForAction(action)
    const state = { turbo: { restorationIdentifier } }
    method.call(history, state, "", location.href)
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
    this.restorationData[restorationIdentifier] = {
      ...restorationData,
      ...additionalData,
    }
  }

  // Scroll restoration

  assumeControlOfScrollRestoration() {
    if (!this.previousScrollRestoration) {
      this.previousScrollRestoration = history.scrollRestoration ?? "auto"
      history.scrollRestoration = "manual"
    }
  }

  relinquishControlOfScrollRestoration() {
    if (this.previousScrollRestoration) {
      history.scrollRestoration = this.previousScrollRestoration
      delete this.previousScrollRestoration
    }
  }

  // Event handlers

  onPopState = (event: PopStateEvent) => {
    if (this.shouldHandlePopState()) {
      const { turbo } = event.state || {}
      if (turbo) {
        this.location = new URL(window.location.href)
        const { restorationIdentifier } = turbo
        this.restorationIdentifier = restorationIdentifier
        this.delegate.historyPoppedToLocationWithRestorationIdentifier(this.location, restorationIdentifier)
      }
    }
  }

  onPageLoad = async (_event: Event) => {
    await nextMicrotask()
    this.pageLoaded = true
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
