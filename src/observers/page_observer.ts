export interface PageObserverDelegate {
  pageBecameInteractive(): void
  pageLoaded(): void
  pageWillUnload(): void
}

export enum PageStage {
  initial,
  loading,
  interactive,
  complete
}

export class PageObserver {
  readonly delegate: PageObserverDelegate
  stage = PageStage.initial
  started = false

  constructor(delegate: PageObserverDelegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      if (this.stage == PageStage.initial) {
        this.stage = PageStage.loading
      }
      document.addEventListener("readystatechange", this.interpretReadyState, false)
      addEventListener("pagehide", this.pageWillUnload, false)
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      document.removeEventListener("readystatechange", this.interpretReadyState, false)
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

  pageIsInteractive() {
    if (this.stage == PageStage.loading) {
      this.stage = PageStage.interactive
      this.delegate.pageBecameInteractive()
    }
  }

  pageIsComplete() {
    this.pageIsInteractive()
    if (this.stage == PageStage.interactive) {
      this.stage = PageStage.complete
      this.delegate.pageLoaded()
    }
  }

  pageWillUnload = () => {
    this.delegate.pageWillUnload()
  }

  get readyState() {
    return document.readyState
  }
}
