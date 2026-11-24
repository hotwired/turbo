import { Snapshot } from "../snapshot"
import { View, type ViewDelegate } from "../view"
import type { FrameElement } from "../../elements/frame_element"
import type { FrameRenderer } from "./frame_renderer"

export type FrameViewDelegate = ViewDelegate<FrameElement, Snapshot<FrameElement>>

export class FrameView extends View<FrameElement, Snapshot<FrameElement>, FrameRenderer, FrameViewDelegate> {
  missing(): void {
    this.element.innerHTML = `<strong class="turbo-frame-error">Content missing</strong>`
  }

  get snapshot(): Snapshot<FrameElement> {
    return new Snapshot(this.element)
  }
}
