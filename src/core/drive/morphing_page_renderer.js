import { PageRenderer } from "./page_renderer"
import { morphBodyElements } from "../morphing"

export class MorphingPageRenderer extends PageRenderer {
  static render(currentBody, newBody) {
    morphBodyElements(currentBody, newBody)
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
