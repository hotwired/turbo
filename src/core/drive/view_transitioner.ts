declare global {
  type ViewTransition = {
    finished: Promise<void>
  }

  interface Document {
    startViewTransition?(callback: () => Promise<void>): ViewTransition
  }
}

export class ViewTransitioner {
  private viewTransitionStarted = false
  private lastOperation = Promise.resolve()

  renderChange(useViewTransition: boolean, render: () => Promise<void>) {
    if (useViewTransition && this.viewTransitionsAvailable && !this.viewTransitionStarted) {
      this.viewTransitionStarted = true
      this.lastOperation = this.lastOperation.then(async () => {
        await document.startViewTransition!(render).finished
      })
    } else {
      this.lastOperation = this.lastOperation.then(render)
    }

    return this.lastOperation
  }

  private get viewTransitionsAvailable() {
    return document.startViewTransition
  }
}
