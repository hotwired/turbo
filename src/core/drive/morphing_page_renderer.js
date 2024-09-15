import { FrameElement } from "../../elements/frame_element"
import { PageRenderer } from "./page_renderer"
import { dispatch } from "../../util"
import { morphElements } from "../morphing"

export class MorphingPageRenderer extends PageRenderer {
  static renderElement(currentElement, newElement) {
    morphElements(currentElement, newElement, {
      callbacks: {
        beforeNodeMorphed: element => !canRefreshFrame(element)
      }
    })

    for (const frame of currentElement.querySelectorAll("turbo-frame")) {
      if (canRefreshFrame(frame)) frame.reload()
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

function canRefreshFrame(frame) {
  return frame instanceof FrameElement &&
    frame.src &&
    frame.refresh === "morph" &&
    !frame.closest("[data-turbo-permanent]") &&
    !frame.parentElement.closest("turbo-frame[src][refresh=morph]")
}
