export const PageStage = {
  initial: 0,
  loading: 1,
  interactive: 2,
  complete: 3
} as const

export type PageStage = (typeof PageStage)[keyof typeof PageStage]

export interface PageObserverDelegate {
  pageBecameInteractive(): void
  pageLoaded(): void
  pageWillUnload(): void
}

export class PageObserver {
  stage: PageStage = PageStage.initial
  started = false
  declare readonly delegate: PageObserverDelegate

  constructor(delegate: PageObserverDelegate) {
    this.delegate = delegate
  }

  start(): void {
    if (!this.started) {
      if (this.stage == PageStage.initial) {
        this.stage = PageStage.loading
      }
      document.addEventListener("readystatechange", this.interpretReadyState, false)
      document.addEventListener("DOMContentLoaded", this.interpretReadyState, false)
      addEventListener("pagehide", this.pageWillUnload, false)
      this.started = true
    }
  }

  stop(): void {
    if (this.started) {
      document.removeEventListener("readystatechange", this.interpretReadyState, false)
      document.removeEventListener("DOMContentLoaded", this.interpretReadyState, false)
      removeEventListener("pagehide", this.pageWillUnload, false)
      this.started = false
    }
  }

  interpretReadyState = () => {
    const { readyState } = this
    if (readyState == "interactive") {
      this.pageIsInteractive()
    } else if (readyState == "complete") {
      this.pageIsComplete()
    }
  }

  pageIsInteractive(): void {
    if (this.stage == PageStage.loading) {
      this.stage = PageStage.interactive
      this.delegate.pageBecameInteractive()
    }
  }

  pageIsComplete(): void {
    this.pageIsInteractive()
    if (this.stage == PageStage.interactive) {
      this.stage = PageStage.complete
      this.delegate.pageLoaded()
    }
  }

  pageWillUnload = () => {
    this.delegate.pageWillUnload()
  }

  get readyState(): DocumentReadyState {
    return document.readyState
  }
}
