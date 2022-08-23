import { Position } from "../types"
import { nextMicrotask, uuid } from "../../util"
import { getUrlHash } from "../url"

export interface HistoryDelegate {
  historyPoppedToLocationWithRestorationIdentifier(location: URL, restorationIdentifier: string): void
}

type HistoryMethod = (this: typeof history, state: any, title: string, url?: string | null | undefined) => void

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
    this.update(history.pushState, location, restorationIdentifier)
  }

  replace(location: URL, restorationIdentifier?: string) {
    this.update(history.replaceState, location, restorationIdentifier)
  }

  update(method: HistoryMethod, location: URL, restorationIdentifier = uuid()) {
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

  handleFrameNavigations = (_event: PopStateEvent) => {
    const hash = Object.fromEntries(getUrlHash(window.location).entries())
    const oldHash = Object.fromEntries(getUrlHash(this.location).entries())

    const keys = Array.from(new Set(Object.keys(hash).concat(Object.keys(oldHash)))).filter((key) =>
      key.endsWith("_frame_src")
    )

    keys.forEach((key) => {
      const source = hash[key] || window.location.pathname

      if (key.endsWith("_frame_src")) {
        const frameId = key.replace("_frame_src", "")
        const frame = document.getElementById(frameId)

        if (frame) {
          frame.setAttribute("src", source)
        }
      }
    })
  }

  onPopState = (event: PopStateEvent) => {
    if (this.shouldHandlePopState()) {
      const { turbo } = event.state || {}
      if (turbo) {
        this.handleFrameNavigations(event)
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
