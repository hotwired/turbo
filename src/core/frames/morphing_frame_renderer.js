import { FrameRenderer } from "./frame_renderer"
import { morphTurboFrameElements } from "../morphing"

export class MorphingFrameRenderer extends FrameRenderer {
  static renderElement(currentElement, newElement) {
    morphTurboFrameElements(currentElement, newElement)
  }

  async preservingPermanentElements(callback) {
    return await callback()
  }
}
