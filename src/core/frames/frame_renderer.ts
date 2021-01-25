import { FrameElement } from "../../elements/frame_element"
import { nextAnimationFrame } from "../../util"
import { Renderer, focusFirstAutofocusableElement, renderSnapshotWithPermanentElements } from "../renderer"

export class FrameRenderer extends Renderer<FrameElement> {
  get shouldRender() {
    return true
  }

  async render() {
    await nextAnimationFrame()
    renderSnapshotWithPermanentElements(this.currentSnapshot, this.newSnapshot, () => {
      this.loadFrameElement()
    })
    this.scrollFrameIntoView()
    await nextAnimationFrame()
    focusFirstAutofocusableElement(this.newSnapshot)
  }

  private loadFrameElement() {
    const destinationRange = document.createRange()
    destinationRange.selectNodeContents(this.currentElement)
    destinationRange.deleteContents()

    const frameElement = this.newElement
    const sourceRange = frameElement.ownerDocument?.createRange()
    if (sourceRange) {
      sourceRange.selectNodeContents(frameElement)
      this.currentElement.appendChild(sourceRange.extractContents())
    }
  }

  private scrollFrameIntoView() {
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
}

function readScrollLogicalPosition(value: string | null, defaultValue: ScrollLogicalPosition): ScrollLogicalPosition {
  if (value == "end" || value == "start" || value == "center" || value == "nearest") {
    return value
  } else {
    return defaultValue
  }
}
