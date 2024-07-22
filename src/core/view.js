import { getAnchor } from "./url"

export class View {
  #resolveRenderPromise = (_value) => {}
  #resolveInterceptionPromise = (_value) => {}

  constructor(delegate, element) {
    this.delegate = delegate
    this.element = element
  }

  // Scrolling

  scrollToAnchor(anchor) {
    const element = this.snapshot.getElementForAnchor(anchor)
    if (element) {
      this.scrollToElement(element)
      this.focusElement(element)
    } else {
      this.scrollToPosition({ x: 0, y: 0 })
    }
  }

  scrollToAnchorFromLocation(location) {
    this.scrollToAnchor(getAnchor(location))
  }

  scrollToElement(element) {
    element.scrollIntoView()
  }

  focusElement(element) {
    if (element instanceof HTMLElement) {
      if (element.hasAttribute("tabindex")) {
        element.focus()
      } else {
        element.setAttribute("tabindex", "-1")
        element.focus()
        element.removeAttribute("tabindex")
      }
    }
  }

  scrollToPosition({ x, y }) {
    this.scrollRoot.scrollTo(x, y)
  }

  scrollToTop() {
    this.scrollToPosition({ x: 0, y: 0 })
  }

  get scrollRoot() {
    return window
  }

  // Rendering

  async render(renderer) {
    const { isPreview, shouldRender, willRender, newSnapshot: snapshot } = renderer

    // A workaround to ignore tracked element mismatch reloads when performing
    // a promoted Visit from a frame navigation
    const shouldInvalidate = willRender

    if (shouldRender) {
      try {
        this.renderPromise = new Promise((resolve) => (this.#resolveRenderPromise = resolve))
        this.renderer = renderer
        await this.prepareToRenderSnapshot(renderer)

        const renderInterception = new Promise((resolve) => (this.#resolveInterceptionPromise = resolve))
        const options = { resume: this.#resolveInterceptionPromise, render: this.renderer.renderElement, renderMethod: this.renderer.renderMethod }
        const immediateRender = this.delegate.allowsImmediateRender(snapshot, options)
        if (!immediateRender) await renderInterception

        await this.renderSnapshot(renderer)
        this.delegate.viewRenderedSnapshot(snapshot, isPreview, this.renderer.renderMethod)
        this.delegate.preloadOnLoadLinksForView(this.element)
        this.finishRenderingSnapshot(renderer)
      } finally {
        delete this.renderer
        this.#resolveRenderPromise(undefined)
        delete this.renderPromise
      }
    } else if (shouldInvalidate) {
      this.invalidate(renderer.reloadReason)
    } else {
      this.delegate.setLastRenderedLocation()
    }
  }

  invalidate(reason) {
    this.delegate.viewInvalidated(reason)
  }

  async prepareToRenderSnapshot(renderer) {
    this.markAsPreview(renderer.isPreview)
    await renderer.prepareToRender()
  }

  markAsPreview(isPreview) {
    if (isPreview) {
      this.element.setAttribute("data-turbo-preview", "")
    } else {
      this.element.removeAttribute("data-turbo-preview")
    }
  }

  markVisitDirection(direction) {
    this.element.setAttribute("data-turbo-visit-direction", direction)
  }

  unmarkVisitDirection() {
    this.element.removeAttribute("data-turbo-visit-direction")
  }

  async renderSnapshot(renderer) {
    await renderer.render()
  }

  finishRenderingSnapshot(renderer) {
    renderer.finishRendering()
  }
}
