export const PageStage = {
  initial: 0,
  loading: 1,
  interactive: 2,
  complete: 3
}

export class PageObserver {
  stage = PageStage.initial
  started = false

  constructor(delegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      console.log(`[PageObserver] start() called - stage: ${this.getStageLabel(this.stage)}, readyState: ${document.readyState}, timestamp: ${Date.now()}`)
      
      if (this.stage == PageStage.initial) {
        this.stage = PageStage.loading
      }
      document.addEventListener("readystatechange", this.interpretReadyState, false)
      addEventListener("pagehide", this.pageWillUnload, false)
      this.started = true
      
      // Handle case where script loads with defer attribute
      // Deferred scripts execute when readyState is "interactive" (after HTML parsing, before DOMContentLoaded)
      // We need to wait for DOMContentLoaded to ensure all deferred scripts have executed before firing turbo:load
      console.log(`[PageObserver] checking initial readyState: ${document.readyState}, timestamp: ${Date.now()}`)
      
      if (document.readyState === "interactive") {
        // Script loaded with defer - wait for DOMContentLoaded to ensure all deferred scripts are ready
        console.log(`[PageObserver] readyState is 'interactive', waiting for DOMContentLoaded before firing turbo:load`)
        document.addEventListener("DOMContentLoaded", () => {
          console.log(`[PageObserver] DOMContentLoaded fired, now checking state - timestamp: ${Date.now()}`)
          this.interpretReadyState()
        }, { once: true })
      }
      // Note: If readyState is "loading", listeners will catch state changes normally
      // Note: If readyState is "complete", script loaded async after page load - don't fire turbo:load (intentional)
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
    console.log(`[PageObserver] interpretReadyState - readyState: ${readyState}, stage: ${this.getStageLabel(this.stage)}, timestamp: ${Date.now()}`)
    
    if (readyState == "interactive") {
      this.pageIsInteractive()
    } else if (readyState == "complete") {
      this.pageIsComplete()
    }
  }

  pageIsInteractive() {
    console.log(`[PageObserver] pageIsInteractive - stage: ${this.getStageLabel(this.stage)}, timestamp: ${Date.now()}`)
    
    if (this.stage == PageStage.loading) {
      this.stage = PageStage.interactive
      console.log(`[PageObserver] 🎯 FIRING turbo:load (pageBecameInteractive) - timestamp: ${Date.now()}`)
      this.delegate.pageBecameInteractive()
    } else {
      console.log(`[PageObserver] ⏭️  SKIPPING pageBecameInteractive (stage already ${this.getStageLabel(this.stage)})`)
    }
  }

  pageIsComplete() {
    console.log(`[PageObserver] pageIsComplete - stage: ${this.getStageLabel(this.stage)}, timestamp: ${Date.now()}`)
    
    this.pageIsInteractive()
    if (this.stage == PageStage.interactive) {
      this.stage = PageStage.complete
      console.log(`[PageObserver] ✅ Page fully loaded (pageLoaded) - timestamp: ${Date.now()}`)
      this.delegate.pageLoaded()
    }
  }

  pageWillUnload = () => {
    this.delegate.pageWillUnload()
  }

  get readyState() {
    return document.readyState
  }

  getStageLabel(stage) {
    const labels = {
      [PageStage.initial]: 'initial',
      [PageStage.loading]: 'loading',
      [PageStage.interactive]: 'interactive',
      [PageStage.complete]: 'complete'
    }
    return labels[stage] || 'unknown'
  }
}
