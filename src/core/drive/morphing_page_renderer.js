import { PageRenderer } from "./page_renderer"
import { dispatch } from "../../util"
import {
  morphElements,
  shouldRefreshFrameWithMorphing,
  shouldPreserveFrameDuringMorphRefresh,
  closestFrameReloadableWithMorphing
} from "../morphing"

export class MorphingPageRenderer extends PageRenderer {
  static renderElement(currentElement, newElement) {
    morphElements(currentElement, newElement, {
      callbacks: {
        beforeNodeMorphed: (node, newNode) => {
          if (shouldPreserveFrameDuringMorphRefresh(node, newNode, "page-morph")) {
            return false
          }
          if (
            shouldRefreshFrameWithMorphing(node, newNode) &&
              !closestFrameReloadableWithMorphing(node)
          ) {
            node.reload()
            return false
          }
          return true
        }
      }
    })

    dispatch("turbo:morph", { detail: { currentElement, newElement } })
  }

  async preservingPermanentElements(callback) {
    return await callback()
  }

  get renderMethod() {
    return "morph"
  }

  get shouldAutofocus() {
    return false
  }
}

