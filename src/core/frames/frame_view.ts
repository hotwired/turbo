import { FrameElement } from "../../elements"
import { Snapshot } from "../snapshot"
import { View, ViewRenderOptions } from "../view"

export type FrameViewRenderOptions = ViewRenderOptions<FrameElement>

export class FrameView extends View<FrameElement> {
  invalidate() {
    this.element.innerHTML = ""
  }

  get snapshot() {
    return new Snapshot(this.element)
  }
}
