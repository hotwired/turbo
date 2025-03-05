import { nextMicrotask, uuid } from "../../util"

export class History {
  location
  restorationIdentifier = uuid()
  restorationData = {}
  started = false
  pageLoaded = false
  currentIndex = 0

  constructor(delegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      addEventListener("popstate", this.onPopState, false)
      addEventListener("load", this.onPageLoad, false)
      this.currentIndex = history.state?.turbo?.restorationIndex || 0
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

  push(location, restorationIdentifier) {
    this.update(history.pushState, location, restorationIdentifier)
  }

  replace(location, restorationIdentifier) {
    this.update(history.replaceState, location, restorationIdentifier)
  }

  update(method, location, restorationIdentifier = uuid()) {
    if (method === history.pushState) ++this.currentIndex

    const state = { turbo: { restorationIdentifier, restorationIndex: this.currentIndex } }
    method.call(history, state, "", location.href)
    this.location = location
    this.restorationIdentifier = restorationIdentifier
  }

  // Restoration data

  getRestorationDataForIdentifier(restorationIdentifier) {
    return this.restorationData[restorationIdentifier] || {}
  }

  updateRestorationData(additionalData) {
    const { restorationIdentifier } = this
    const restorationData = this.restorationData[restorationIdentifier]
    this.restorationData[restorationIdentifier] = {
      ...restorationData,
      ...additionalData
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

  onPopState = (event) => {
    if (this.shouldHandlePopState()) {
      const { turbo } = event.state || {}
      if (turbo) {
        this.location = new URL(window.location.href)
        const { restorationIdentifier, restorationIndex } = turbo
        this.restorationIdentifier = restorationIdentifier
        const direction = restorationIndex > this.currentIndex ? "forward" : "back"
        this.delegate.historyPoppedToLocationWithRestorationIdentifierAndDirection(this.location, restorationIdentifier, direction)
        this.currentIndex = restorationIndex
      }
    }
  }

  onPageLoad = async (_event) => {
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
