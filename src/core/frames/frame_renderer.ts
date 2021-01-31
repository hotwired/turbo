import { FrameElement } from "../../elements/frame_element"
import { nextAnimationFrame } from "../../util"
import { Renderer } from "../renderer"
import { Snapshot } from "../snapshot"
import { StreamActions, StreamAction } from "../streams/stream_actions"

export class FrameRenderer extends Renderer<FrameElement> {
  readonly streamAction: StreamAction
  constructor(currentSnapshot: Snapshot<FrameElement>, newSnapshot: Snapshot<FrameElement>, isPreview: boolean, streamAction: StreamAction) {
    super(currentSnapshot, newSnapshot, isPreview)
    this.streamAction = streamAction
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
    const sourceRange = this.newElement.ownerDocument.createRange()
    sourceRange.selectNodeContents(this.newElement)

    StreamActions[this.streamAction].apply({
      removeDuplicates: false,
      targetElements: [this.currentElement],
      templateContent: sourceRange.extractContents(),
    })
  }

  scrollFrameIntoView() {
    if (this.currentElement.autoscroll || this.newElement.autoscroll) {
      const element = this.currentElement.firstElementChild
      const block = readScrollLogicalPosition(this.currentElement.getAttribute("data-autoscroll-block"), "end")

      if (element) {
        element.scrollIntoView({ block })
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
