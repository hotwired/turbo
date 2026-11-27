export class ViewTransitioner {
  #viewTransitionStarted = false
  #lastOperation = Promise.resolve()

  renderChange(useViewTransition: boolean, render: () => void | Promise<void>): Promise<void> {
    if (useViewTransition && this.viewTransitionsAvailable && !this.#viewTransitionStarted) {
      this.#viewTransitionStarted = true
      this.#lastOperation = this.#lastOperation.then(async () => {
        const transition = document.startViewTransition(render)
        transition.ready.catch(() => {})
        await transition.finished
      })
    } else {
      this.#lastOperation = this.#lastOperation.then(render)
    }

    return this.#lastOperation
  }

  // Typed locally: older TypeScript DOM libs lack Document#startViewTransition.
  get viewTransitionsAvailable(): ((callback: () => unknown) => unknown) | undefined {
    return document.startViewTransition
  }
}
