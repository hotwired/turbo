import { Snapshot } from "../snapshot"
import { View } from "../view"

export class FrameView extends View {
  missing() {
    this.element.innerHTML = `<strong class="turbo-frame-error">Content missing</strong>`
  }

  get snapshot() {
    return new Snapshot(this.element)
  }
}
