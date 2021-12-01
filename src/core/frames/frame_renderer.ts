import { FrameElement } from "../../elements/frame_element"
import { nextAnimationFrame } from "../../util"
import { Renderer } from "../renderer"
import { Snapshot } from "../snapshot"

export interface FrameRendererDelegate {
  frameContentsExtracted(fragment: DocumentFragment): void
}

export class FrameRenderer extends Renderer<FrameElement> {
  private readonly delegate: FrameRendererDelegate

  constructor(
    delegate: FrameRendererDelegate,
    currentSnapshot: Snapshot<FrameElement>,
    newSnapshot: Snapshot<FrameElement>,
    isPreview: boolean,
    willRender = true
  ) {
    super(currentSnapshot, newSnapshot, isPreview, willRender)
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
    const destinationRange = document.createRange()
    destinationRange.selectNodeContents(this.currentElement)
    this.delegate.frameContentsExtracted(destinationRange.extractContents())

    const frameElement = this.newElement
    const sourceRange = frameElement.ownerDocument?.createRange()
    if (sourceRange) {
      sourceRange.selectNodeContents(frameElement)
      this.currentElement.appendChild(sourceRange.extractContents())
    }
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
