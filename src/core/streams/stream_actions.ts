import { StreamElement } from "../../elements/stream_element"

export const StreamActions: { [action: string]: (this: StreamElement) => void } = {
  append() {
    this.removeDuplicateTargetChildren()
    this.targetElement?.append(this.templateContent)
  },

  prepend() {
    this.removeDuplicateTargetChildren()
    this.targetElement?.prepend(this.templateContent)
  },

  update_children_or_append() {
    this.replaceDuplicateChildren()
    this.targetElement?.append(this.templateContent)
  },

  update_children_or_prepend() {
    this.replaceDuplicateChildren()
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
