import { getAnchor } from "./url"

/**
 * The View class manages the rendering and scrolling behaviors for a specific element and its delegate.
 */
export class View {
  #resolveRenderPromise = (_value) => {}
  #resolveInterceptionPromise = (_value) => {}

  /**
   * Creates a new View instance.
   *
   * @param {Object} delegate - The delegate that manages the view.
   * @param {HTMLElement} element - The element that the view manages.
   */
  constructor(delegate, element) {
    this.delegate = delegate
    this.element = element
  }

  // Scrolling

  /**
   * Scrolls to the specified anchor in the view's snapshot.
   *
   * @param {string} anchor - The anchor to scroll to.
   */
  scrollToAnchor(anchor) {
    const element = this.snapshot.getElementForAnchor(anchor)
    if (element) {
      this.scrollToElement(element)
      this.focusElement(element)
    } else {
      this.scrollToPosition({ x: 0, y: 0 })
    }
  }

  /**
   * Scrolls to the anchor derived from the specified location.
   *
   * @param {Location} location - The location to get the anchor from.
   */
  scrollToAnchorFromLocation(location) {
    this.scrollToAnchor(getAnchor(location))
  }

  /**
   * Scrolls to the specified element.
   *
   * @param {HTMLElement} element - The element to scroll to.
   */
  scrollToElement(element) {
    element.scrollIntoView()
  }

  /**
   * Focuses the specified element, adding a tabindex attribute if necessary.
   *
   * @param {HTMLElement} element - The element to focus.
   */
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

  /**
   * Scrolls to the specified position.
   *
   * @param {Object} position - The position to scroll to, defined by x and y coordinates.
   * @param {number} position.x - The x-coordinate to scroll to.
   * @param {number} position.y - The y-coordinate to scroll to.
   */
  scrollToPosition({ x, y }) {
    this.scrollRoot.scrollTo(x, y)
  }

  /**
   * Scrolls to the top of the view.
   */
  scrollToTop() {
    this.scrollToPosition({ x: 0, y: 0 })
  }

  /**
   * Gets the root element for scrolling operations, which is the window object.
   *
   * @returns {Window} - The root element for scrolling.
   */
  get scrollRoot() {
    return window
  }

  // Rendering

  /**
   * Renders the view using the specified renderer.
   *
   * @param {Object} renderer - The renderer to use for rendering the view.
   * @returns {Promise<void>} - A promise that resolves when rendering is complete.
   */
  async render(renderer) {
    const { isPreview, shouldRender, newSnapshot: snapshot } = renderer
    if (shouldRender) {
      try {
        this.renderPromise = new Promise((resolve) => (this.#resolveRenderPromise = resolve))
        this.renderer = renderer
        await this.prepareToRenderSnapshot(renderer)

        const renderInterception = new Promise((resolve) => (this.#resolveInterceptionPromise = resolve))
        const options = { resume: this.#resolveInterceptionPromise, render: this.renderer.renderElement }
        const immediateRender = this.delegate.allowsImmediateRender(snapshot, isPreview, options)
        if (!immediateRender) await renderInterception

        await this.renderSnapshot(renderer)
        this.delegate.viewRenderedSnapshot(snapshot, isPreview)
        this.delegate.preloadOnLoadLinksForView(this.element)
        this.finishRenderingSnapshot(renderer)
      } finally {
        delete this.renderer
        this.#resolveRenderPromise(undefined)
        delete this.renderPromise
      }
    } else {
      this.invalidate(renderer.reloadReason)
    }
  }

  /**
   * Invalidates the view for the specified reason.
   *
   * @param {string} reason - The reason for invalidating the view.
   */
  invalidate(reason) {
    this.delegate.viewInvalidated(reason)
  }

  /**
   * Prepares the view to render a snapshot using the specified renderer.
   *
   * @param {Object} renderer - The renderer to use for preparing to render the snapshot.
   * @returns {Promise<void>} - A promise that resolves when the preparation is complete.
   */
  async prepareToRenderSnapshot(renderer) {
    this.markAsPreview(renderer.isPreview)
    await renderer.prepareToRender()
  }

  /**
   * Marks the view as a preview if the specified value is true.
   *
   * @param {boolean} isPreview - Whether to mark the view as a preview.
   */
  markAsPreview(isPreview) {
    if (isPreview) {
      this.element.setAttribute("data-turbo-preview", "")
    } else {
      this.element.removeAttribute("data-turbo-preview")
    }
  }

  /**
   * Renders a snapshot using the specified renderer.
   *
   * @param {Object} renderer - The renderer to use for rendering the snapshot.
   * @returns {Promise<void>} - A promise that resolves when rendering is complete.
   */
  async renderSnapshot(renderer) {
    await renderer.render()
  }

  /**
   * Finishes rendering a snapshot using the specified renderer.
   *
   * @param {Object} renderer - The renderer to use for finishing rendering the snapshot.
   */
  finishRenderingSnapshot(renderer) {
    renderer.finishRendering()
  }
}
