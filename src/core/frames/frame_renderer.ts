import { FrameElement } from "../../elements/frame_element"
import { nextAnimationFrame } from "../../util"
import { Render, Renderer } from "../renderer"
import { Snapshot } from "../snapshot"

export interface FrameRendererDelegate {
  frameExtracted(element: FrameElement): void
}

export class FrameRenderer extends Renderer<FrameElement> {
  private readonly delegate: FrameRendererDelegate

  static renderElement(currentElement: FrameElement, newElement: FrameElement) {
    const destinationRange = document.createRange()
    destinationRange.selectNodeContents(currentElement)
    destinationRange.deleteContents()

    const frameElement = newElement
    const sourceRange = frameElement.ownerDocument?.createRange()
    if (sourceRange) {
      sourceRange.selectNodeContents(frameElement)
      currentElement.appendChild(sourceRange.extractContents())
    }
  }

  constructor(
    delegate: FrameRendererDelegate,
    currentSnapshot: Snapshot<FrameElement>,
    newSnapshot: Snapshot<FrameElement>,
    renderElement: Render<FrameElement>,
    isPreview: boolean,
    willRender = true
  ) {
    super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender)
    this.delegate = delegate
  }

  get shouldRender() {
    return true
  }

  async render() {
    await nextAnimationFrame()
    this.preservingPermanentElements(() => {
      this.loadFrameElement()
    })
    this.scrollFrameIntoView()
    await nextAnimationFrame()
    this.focusFirstAutofocusableElement()
    await nextAnimationFrame()
    this.activateScriptElements()
  }

  loadFrameElement() {
    this.delegate.frameExtracted(this.newElement.cloneNode(true))
    this.renderElement(this.currentElement, this.newElement)
  }

  scrollFrameIntoView() {
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

  activateScriptElements() {
    for (const inertScriptElement of this.newScriptElements) {
      const activatedScriptElement = this.createScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  get newScriptElements() {
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
