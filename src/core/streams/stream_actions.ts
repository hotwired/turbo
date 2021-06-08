import { StreamElement } from "../../elements/stream_element"

export const StreamActions: { [action: string]: (this: StreamElement) => void } = {
  after() {
    this.targetElement?.parentElement?.insertBefore(this.templateContent,this.targetElement.nextSibling)
  },

  append() {
    this.removeDuplicateTargetChildren()
    this.targetElement?.append(this.templateContent)
  },

  before() {
    this.targetElement?.parentElement?.insertBefore(this.templateContent,this.targetElement)
  },

  prepend() {
    this.removeDuplicateTargetChildren()
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
