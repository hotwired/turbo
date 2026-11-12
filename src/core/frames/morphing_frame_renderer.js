import { FrameRenderer } from "./frame_renderer"
import { morphChildren, shouldRefreshFrameWithMorphing, closestFrameReloadableWithMorphing } from "../morphing"
import { dispatch } from "../../util"

export class MorphingFrameRenderer extends FrameRenderer {
  static renderElement(currentElement, newElement) {
    dispatch("turbo:before-frame-morph", {
      target: currentElement,
      detail: { currentElement, newElement }
    })

    morphChildren(currentElement, newElement, {
      callbacks: {
        beforeNodeMorphed: (node, newNode) => {
          if (
            shouldRefreshFrameWithMorphing(node, newNode) &&
              closestFrameReloadableWithMorphing(node) === currentElement
          ) {
            node.reload()
            return false
          }
          return true
        }
      }
    })
  }

  async preservingPermanentElements(callback) {
    return await callback()
  }
}

