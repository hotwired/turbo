import { FrameRenderer } from "./frame_renderer"
import { morphElements } from "../morph_elements"
import { dispatch } from "../../util"

export class MorphFrameRenderer extends FrameRenderer {
  static renderElement(currentElement, newParentElement) {
    const newElement = newParentElement.children

    dispatch("turbo:before-frame-morph", {
      target: currentElement,
      detail: { currentElement, newElement }
    })

    morphElements(currentElement, newElement, "innerHTML")
  }
}
