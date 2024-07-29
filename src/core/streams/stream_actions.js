import { session } from "../"
import morph from "./actions/morph"

export const StreamActions = {
  after() {
    this.removeDuplicateTargetSiblings()
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e.nextSibling))
  },

  append() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.append(this.templateContent))
  },

  before() {
    this.removeDuplicateTargetSiblings()
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e))
  },

  prepend() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.prepend(this.templateContent))
  },

  remove() {
    this.targetElements.forEach((e) => e.remove())
  },

  replace() {
    this.targetElements.forEach((e) => e.replaceWith(this.templateContent))
  },

  update() {
    this.targetElements.forEach((targetElement) => {
      targetElement.innerHTML = ""
      targetElement.append(this.templateContent)
    })
  },

  refresh() {
    session.refresh(this.baseURI, this.requestId)
  },

  morph() {
    morph(this)
  }
}
