import { PageRenderer } from "./page_renderer"
import { dispatch } from "../../util"
import { morphElements } from "../morphing"

export class MorphingPageRenderer extends PageRenderer {
  static renderElement(currentElement, newElement) {
    morphElements(currentElement, newElement, {
      callbacks: {
        beforeNodeMorphed: element => {
          return !super.shouldRefreshChildFrameWithMorphing(null, element)
        }
      }
    })

    for (const frame of currentElement.querySelectorAll("turbo-frame")) {
      if (super.shouldRefreshChildFrameWithMorphing(null, frame)) {
        frame.reload()
      }
    }

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

