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
        beforeNodeMorphed: element => {
          return !super.shouldRefreshChildFrameWithMorphing(currentElement, element)
        }
      }
    })
    for (const frame of currentElement.querySelectorAll("turbo-frame")) {
      if (super.shouldRefreshChildFrameWithMorphing(currentElement, frame)) {
        frame.reload()
      }
    }
  }

  async preservingPermanentElements(callback) {
    return await callback()
  }
}

