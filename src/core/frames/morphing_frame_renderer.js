import { FrameElement } from "../../elements/frame_element"
import { FrameRenderer } from "./frame_renderer"
import { morphChildren } from "../morphing"
import { dispatch } from "../../util"

export class MorphingFrameRenderer extends FrameRenderer {
  static renderElement(currentElement, newElement) {
    dispatch("turbo:before-frame-morph", {
      target: currentElement,
      detail: { currentElement, newElement }
    })

    morphChildren(currentElement, newElement, {
      callbacks: {
        beforeNodeMorphed: element => !canRefreshFrame(element, currentElement)
      }
    })
    for (const frame of currentElement.querySelectorAll("turbo-frame")) {
      if (canRefreshFrame(frame, currentElement)) frame.reload()
    }
  }

  async preservingPermanentElements(callback) {
    return await callback()
  }
}

function canRefreshFrame(frame, currentFrame) {
  return frame instanceof FrameElement &&
    frame.src &&
    frame.refresh === "morph" &&
    !frame.closest("[data-turbo-permanent]") &&
    frame.parentElement.closest("turbo-frame[src][refresh=morph]").id === currentFrame.id
}
