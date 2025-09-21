import { PageRenderer } from "./page_renderer"
import { morphBodyElements } from "../morphing"

export class MorphingPageRenderer extends PageRenderer {
  static renderElement(currentElement, newElement) {
    morphBodyElements(currentElement, newElement)
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
