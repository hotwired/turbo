import { activateScriptElement, nextRepaint } from "../../util"
import { Renderer } from "../renderer"
import type { FrameElement } from "../../elements/frame_element"
import type { Snapshot } from "../snapshot"

export interface FrameRendererDelegate {
  willRenderFrame(currentElement: FrameElement, newElement: FrameElement): void
}

export class FrameRenderer extends Renderer<FrameElement> {
  declare readonly delegate: FrameRendererDelegate

  static renderElement(currentElement: Element, newElement: Element): void {
    const sourceRange = newElement.ownerDocument.createRange()
    sourceRange.selectNodeContents(newElement)
    currentElement.replaceChildren(sourceRange.extractContents())
  }

  constructor(
    delegate: FrameRendererDelegate,
    currentSnapshot: Snapshot<FrameElement>,
    newSnapshot: Snapshot<FrameElement>,
    renderElement: unknown,
    isPreview: boolean,
    willRender = true
  ) {
    // TODO(types): Renderer's constructor lost its renderElement parameter in 03549a9, so these
    // arguments are shifted: Renderer receives renderElement as isPreview and isPreview as
    // willRender. FrameController passes false for both, which hides the bug.
    // @ts-expect-error -- see above
    super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender)
    this.delegate = delegate
  }

  get shouldRender(): boolean {
    return true
  }

  async render(): Promise<void> {
    await nextRepaint()
    this.preservingPermanentElements(() => {
      this.loadFrameElement()
    })
    this.scrollFrameIntoView()
    await nextRepaint()
    this.focusFirstAutofocusableElement()
    await nextRepaint()
    this.activateScriptElements()
  }

  loadFrameElement(): void {
    this.delegate.willRenderFrame(this.currentElement, this.newElement)
    this.renderElement(this.currentElement, this.newElement)
  }

  scrollFrameIntoView(): boolean {
    if (this.currentElement.autoscroll || this.newElement.autoscroll) {
      const element = this.currentElement.firstElementChild
      const block = readScrollLogicalPosition(this.currentElement.getAttribute("data-autoscroll-block"), "end")
      const behavior = readScrollBehavior(this.currentElement.getAttribute("data-autoscroll-behavior"), "auto")

      if (element) {
        element.scrollIntoView({ block, behavior })
        return true
      }
    }
    return false
  }

  activateScriptElements(): void {
    for (const inertScriptElement of this.newScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  get newScriptElements(): NodeListOf<HTMLScriptElement> {
    return this.currentElement.querySelectorAll("script")
  }
}

function readScrollLogicalPosition(value: string | null, defaultValue: ScrollLogicalPosition): ScrollLogicalPosition {
  if (value == "end" || value == "start" || value == "center" || value == "nearest") {
    return value
  } else {
    return defaultValue
  }
}

function readScrollBehavior(value: string | null, defaultValue: ScrollBehavior): ScrollBehavior {
  if (value == "auto" || value == "smooth") {
    return value
  } else {
    return defaultValue
  }
}
