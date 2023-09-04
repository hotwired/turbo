export class ViewTransitioner {
  #viewTransitionStarted = false
  #lastOperation = Promise.resolve()

  renderChange(useViewTransition, render) {
    if (useViewTransition && this.viewTransitionsAvailable && !this.#viewTransitionStarted) {
      this.#viewTransitionStarted = true
      this.#lastOperation = this.#lastOperation.then(async () => {
        await document.startViewTransition(render).finished
      })
    } else {
      this.#lastOperation = this.#lastOperation.then(render)
    }

    return this.#lastOperation
  }

  get viewTransitionsAvailable() {
    return document.startViewTransition
  }
}
