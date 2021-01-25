import { Renderer } from "./renderer"
import { Snapshot } from "./snapshot"
import { Position } from "./types"

export interface ViewDelegate<S extends Snapshot> {
  viewWillRenderSnapshot(snapshot: S, isPreview: boolean): void
  viewRenderedSnapshot(snapshot: S, isPreview: boolean): void
  viewInvalidated(): void
}

export abstract class View<S extends Snapshot, D extends ViewDelegate<S>, R extends Renderer<S>> {
  readonly delegate: D
  readonly element: HTMLElement
  renderer?: R
  abstract readonly snapshot: S

  constructor(delegate: D, element: HTMLElement) {
    this.delegate = delegate
    this.element = element
  }

  // Scrolling

  scrollToAnchor(anchor: string) {
    const element = this.snapshot.getElementForAnchor(anchor)
    if (element) {
      this.scrollToElement(element)
    } else {
      this.scrollToPosition({ x: 0, y: 0 })
    }
  }

  scrollToElement(element: Element) {
    element.scrollIntoView()
  }

  scrollToPosition({ x, y }: Position) {
    this.scrollRoot.scrollTo(x, y)
  }

  get scrollRoot(): { scrollTo(x: number, y: number): void } {
    return window
  }

  // Rendering

  async render(renderer: R) {
    if (this.renderer) {
      throw new Error("rendering is already in progress")
    }

    const { isPreview, shouldRender, toSnapshot: snapshot } = renderer
    if (shouldRender) {
      try {
        this.renderer = renderer
        this.prepareToRenderSnapshot(renderer)
        this.delegate.viewWillRenderSnapshot(snapshot, isPreview)
        await this.renderSnapshot(renderer)
        this.delegate.viewRenderedSnapshot(snapshot, isPreview)
        this.finishRenderingSnapshot(renderer)
      } finally {
        delete this.renderer
      }
    } else {
      this.delegate.viewInvalidated()
    }
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
