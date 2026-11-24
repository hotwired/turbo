import { PageRenderer } from "./page_renderer"
import { dispatch } from "../../util"
import { morphElements, shouldRefreshFrameWithMorphing, closestFrameReloadableWithMorphing } from "../morphing"
import type { FrameElement } from "../../elements/frame_element"
import type { RenderMethod } from "../renderer"

export class MorphingPageRenderer extends PageRenderer {
  static override renderElement(currentElement: Element, newElement: Element): void {
    morphElements(currentElement, newElement, {
      callbacks: {
        beforeNodeMorphed: (node, newNode) => {
          if (
            shouldRefreshFrameWithMorphing(node, newNode) &&
              !closestFrameReloadableWithMorphing(node)
          ) {
            (node as FrameElement).delegate.refreshForMorph()
            return false
          }
          return true
        }
      }
    })

    dispatch("turbo:morph", { detail: { currentElement, newElement } })
  }

  override async preservingPermanentElements(callback: () => void | Promise<void>): Promise<void> {
    return await callback()
  }

  override get renderMethod(): RenderMethod {
    return "morph"
  }

  override get shouldAutofocus(): boolean {
    return false
  }
}

