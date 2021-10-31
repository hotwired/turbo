import { ReloadReason } from "./native/browser_adapter"
import { Renderer } from "./renderer"
import { Snapshot } from "./snapshot"
import { Position } from "./types"
import { getAnchor } from "./url"

export interface ViewRenderOptions {
  resume: (value: any) => void
}

export interface ViewDelegate<E extends Element, S extends Snapshot<E>> {
  allowsImmediateRender(snapshot: S, options: ViewRenderOptions): boolean
  preloadOnLoadLinksForView(element: Element): void
  viewRenderedSnapshot(snapshot: S, isPreview: boolean): void
  viewInvalidated(reason: ReloadReason): void
}

export abstract class View<
  E extends Element,
  S extends Snapshot<E> = Snapshot<E>,
  R extends Renderer<E, S> = Renderer<E, S>,
  D extends ViewDelegate<E, S> = ViewDelegate<E, S>
> {
  readonly delegate: D
  readonly element: E
  renderer?: R
  abstract readonly snapshot: S
  renderPromise?: Promise<void>
  private resolveRenderPromise = (_value: any) => {}
  private resolveInterceptionPromise = (_value: any) => {}

  constructor(delegate: D, element: E) {
    this.delegate = delegate
    this.element = element
  }

  // Scrolling

  scrollToAnchor(anchor: string | undefined) {
    const element = this.snapshot.getElementForAnchor(anchor)
    if (element) {
      this.scrollToElement(element)
      this.focusElement(element)
    } else {
      this.scrollToPosition({ x: 0, y: 0 })
    }
  }

  scrollToAnchorFromLocation(location: URL) {
    this.scrollToAnchor(getAnchor(location))
  }

  scrollToElement(element: Element) {
    element.scrollIntoView()
  }

  focusElement(element: Element) {
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

  scrollToPosition({ x, y }: Position) {
    this.scrollRoot.scrollTo(x, y)
  }

  scrollToTop() {
    this.scrollToPosition({ x: 0, y: 0 })
  }

  get scrollRoot(): { scrollTo(x: number, y: number): void } {
    return window
  }

  // Rendering

  async render(renderer: R) {
    const { isPreview, shouldRender, newSnapshot: snapshot } = renderer
    if (shouldRender) {
      try {
        this.renderPromise = new Promise((resolve) => (this.resolveRenderPromise = resolve))
        this.renderer = renderer
        this.prepareToRenderSnapshot(renderer)

        const renderInterception = new Promise((resolve) => (this.resolveInterceptionPromise = resolve))
        const options = { resume: this.resolveInterceptionPromise }
        const immediateRender = this.delegate.allowsImmediateRender(snapshot, options)
        if (!immediateRender) await renderInterception

        await this.renderSnapshot(renderer)
        this.delegate.viewRenderedSnapshot(snapshot, isPreview)
        this.delegate.preloadOnLoadLinksForView(this.element)
        this.finishRenderingSnapshot(renderer)
      } finally {
        delete this.renderer
        this.resolveRenderPromise(undefined)
        delete this.renderPromise
      }
    } else {
      this.invalidate(renderer.reloadReason)
    }
  }

  invalidate(reason: ReloadReason) {
    this.delegate.viewInvalidated(reason)
  }

  prepareToRenderSnapshot(renderer: R) {
    this.markAsPreview(renderer.isPreview)
    renderer.prepareToRender()
  }

  markAsPreview(isPreview: boolean) {
    if (isPreview) {
      this.element.setAttribute("data-turbo-preview", "")
    } else {
      this.element.removeAttribute("data-turbo-preview")
    }
  }

  async renderSnapshot(renderer: R) {
    await renderer.render()
  }

  finishRenderingSnapshot(renderer: R) {
    renderer.finishRendering()
  }
}
