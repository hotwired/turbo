import { Snapshot } from "../snapshot"
import { View } from "../view"

export class FrameView extends View {
  missing() {
    this.element.innerHTML = `<strong class="turbo-frame-error">Content missing. Failed to find a matching <turbo-frame id="${this.element.id}"> tag. </strong>`
  }

  get snapshot() {
    return new Snapshot(this.element)
  }
}
