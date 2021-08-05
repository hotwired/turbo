import { StreamElement } from "../../elements/stream_element"

export const StreamActions: { [action: string]: (this: StreamElement) => void } = {
  after() {
    this.targetElements.forEach(e => e.parentElement?.insertBefore(this.templateContent, e.nextSibling))
  },

  append() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach(e => e.append(this.templateContent))
  },

  before() {
    this.targetElements.forEach(e => e.parentElement?.insertBefore(this.templateContent, e))
  },

  prepend() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach(e => e.prepend(this.templateContent))
  },

  remove() {
    this.targetElements.forEach(e => e.remove())
  },

  replace() {
    this.targetElements.forEach(e => e.replaceWith(this.templateContent))
  },

  reload() {
    this.targetElements.forEach(e => {
      if (typeof(e["reload"]) == "function") {
        e.reload()
      }
    })
  },

  update() {
    this.targetElements.forEach(e => { 
      e.innerHTML = ""
      e.append(this.templateContent)
    })
  }
}
