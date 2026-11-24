import { FrameRenderer } from "./frame_renderer"
import { morphChildren, shouldRefreshFrameWithMorphing, closestFrameReloadableWithMorphing } from "../morphing"
import { dispatch } from "../../util"
import type { FrameElement } from "../../elements/frame_element"

export class MorphingFrameRenderer extends FrameRenderer {
  static renderElement(currentElement: Element, newElement: Element): void {
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
            (node as FrameElement).delegate.refreshForMorph()
            return false
          }
          return true
        }
      }
    })
  }

  async preservingPermanentElements(callback: () => void | Promise<void>): Promise<void> {
    return await callback()
  }
}

