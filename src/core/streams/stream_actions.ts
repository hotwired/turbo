import { StreamElement } from "../../elements/stream_element"

export const StreamActions: { [action: string]: (this: StreamElement) => void } = {
  append() {
    this.targetElement?.append(this.templateContent)
  },

  prepend() {
    this.targetElement?.prepend(this.templateContent)
  },

  remove() {
    this.targetElement?.remove()
  },

  replace() {
    this.targetElement?.replaceWith(this.templateContent)
  },

  update() {
    if (this.targetElement) {
      this.targetElement.innerHTML = ""
      this.targetElement.append(this.templateContent)
    }
  }
}
