import { getAnchor } from "./url"
import type { Render, Renderer, RenderMethod } from "./renderer"
import type { Snapshot } from "./snapshot"
import type { Position, ReloadReason } from "./types"

export interface ViewRenderOptions<E extends Element = Element> {
  resume: (value?: unknown) => void
  render: Render<E>
  renderMethod: RenderMethod
}

export interface ViewDelegate<E extends Element = Element, S extends Snapshot<E> = Snapshot<E>> {
  allowsImmediateRender(snapshot: S, options: ViewRenderOptions<E>): boolean
  preloadOnLoadLinksForView(element: Element): void
  viewRenderedSnapshot(snapshot: S, isPreview: boolean, renderMethod: RenderMethod): void
  viewInvalidated(reason: ReloadReason): void
}

export abstract class View<
  E extends Element = Element,
  S extends Snapshot<E> = Snapshot<E>,
  R extends Renderer<E, S> = Renderer<E, S>,
  D extends ViewDelegate<E, S> = ViewDelegate<E, S>
> {
  declare readonly delegate: D
  declare readonly element: E
  declare renderer?: R
  declare renderPromise?: Promise<void>
  abstract get snapshot(): S

  constructor(delegate: D, element: E) {
    this.delegate = delegate
    this.element = element
  }

  // Scrolling

  scrollToAnchor(anchor: string | undefined): void {
    const element = this.snapshot.getElementForAnchor(anchor)
    if (element) {
      this.focusElement(element)
      this.scrollToElement(element)
    } else {
      this.scrollToPosition({ x: 0, y: 0 })
    }
  }

  scrollToAnchorFromLocation(location: URL): void {
    this.scrollToAnchor(getAnchor(location))
  }

  scrollToElement(element: Element): void {
    element.scrollIntoView()
  }

  focusElement(element: Element): void {
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

  scrollToPosition({ x, y }: Position): void {
    this.scrollRoot.scrollTo({ left: x, top: y, behavior: "instant" })
  }

  scrollToTop(): void {
    this.scrollToPosition({ x: 0, y: 0 })
  }

  get scrollRoot(): { scrollTo(options: ScrollToOptions): void } {
    return window
  }

  // Rendering

  async render(renderer: R): Promise<void> {
    const { isPreview, shouldRender, willRender, newSnapshot: snapshot } = renderer

    if (shouldRender) {
      const previousRender = this.renderPromise
      let resolveRenderPromise!: (value: void) => void
      const renderPromise = new Promise<void>((resolve) => (resolveRenderPromise = resolve))
      this.renderPromise = renderPromise

      try {
        if (previousRender) await previousRender
        this.renderer = renderer
        await this.prepareToRenderSnapshot(renderer)

        let resume!: (value?: unknown) => void
        const renderInterception = new Promise((resolve) => (resume = resolve))
        const options = { resume, render: renderer.renderElement, renderMethod: renderer.renderMethod }
        const immediateRender = this.delegate.allowsImmediateRender(snapshot, options)
        if (!immediateRender) await renderInterception

        await this.renderSnapshot(renderer)
        this.delegate.viewRenderedSnapshot(snapshot, isPreview, renderer.renderMethod)
        this.delegate.preloadOnLoadLinksForView(this.element)
        this.finishRenderingSnapshot(renderer)
      } finally {
        if (this.renderer === renderer) delete this.renderer
        resolveRenderPromise(undefined)
        if (this.renderPromise === renderPromise) delete this.renderPromise
      }
    } else {
      const { reloadReason } = renderer
      if (willRender || reloadReason) this.invalidate(reloadReason)
    }
  }

  invalidate(reason: ReloadReason): void {
    this.delegate.viewInvalidated(reason)
  }

  async prepareToRenderSnapshot(renderer: R): Promise<void> {
    this.markAsPreview(renderer.isPreview)
    await renderer.prepareToRender()
  }

  markAsPreview(isPreview: boolean): void {
    if (isPreview) {
      this.element.setAttribute("data-turbo-preview", "")
    } else {
      this.element.removeAttribute("data-turbo-preview")
    }
  }

  markVisitDirection(direction: string): void {
    this.element.setAttribute("data-turbo-visit-direction", direction)
  }

  unmarkVisitDirection(): void {
    this.element.removeAttribute("data-turbo-visit-direction")
  }

  async renderSnapshot(renderer: R): Promise<void> {
    await renderer.render()
  }

  finishRenderingSnapshot(renderer: R): void {
    renderer.finishRendering()
  }
}
