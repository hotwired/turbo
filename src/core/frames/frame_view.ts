import { FrameElement } from "../../elements"
import { Snapshot } from "../snapshot"
import { View, ViewRenderOptions } from "../view"

export type FrameViewRenderOptions = ViewRenderOptions<FrameElement>

export class FrameView extends View<FrameElement> {
  missing() {
    this.element.innerHTML = `<strong class="turbo-frame-error">Content missing</strong>`
  }

  get snapshot() {
    return new Snapshot(this.element)
  }
}
