import { Renderer } from "../renderer"
import { Morph } from "../morph"

export class MorphRenderer extends Renderer {
  static renderElement(currentElement, newElement) {
    MorphRenderer.morph(currentElement, newElement)
  }

  static morph(currentElement, newElement) {
    Morph.render(currentElement, newElement)
  }

  async render() {
    if (this.willRender) this.renderElement(this.currentElement, this.newElement)
  }

  get renderMethod() {
    return "morph"
  }
}
