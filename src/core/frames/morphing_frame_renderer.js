import { FrameRenderer } from "./frame_renderer"
import {
  morphChildren,
  shouldRefreshFrameWithMorphing,
  shouldPreserveFrameDuringMorphRefresh,
  closestFrameReloadableWithMorphing
} from "../morphing"
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
          if (shouldPreserveFrameDuringMorphRefresh(node, newNode, "frame-morph")) {
            return false
          }
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

