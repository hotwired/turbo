import { FrameRenderer } from "./frame_renderer"
import { morphTurboFrameElements } from "../morphing"

export class MorphingFrameRenderer extends FrameRenderer {
  static render(currentFrame, newFrame) {
    morphTurboFrameElements(currentFrame, newFrame)
  }

  async preservingPermanentElements(callback) {
    return await callback()
  }
}
