import { session } from "../"
import { morphChildren, morphElement } from "./actions/morph"

export const StreamActions = {
  after() {
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e.nextSibling))
  },

  append() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.append(this.templateContent))
  },

  before() {
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
    const method = this.getAttribute("method")

    this.targetElements.forEach((targetElement) => {
      if (method === "morph") {
        morphElement(targetElement, this.templateContent)
      } else {
        targetElement.replaceWith(this.templateContent)
      }
    })
  },

  update() {
    const method = this.getAttribute("method")

    this.targetElements.forEach((targetElement) => {
      if (method === "morph") {
        morphChildren(targetElement, this.templateContent)
      } else {
        targetElement.innerHTML = ""
        targetElement.append(this.templateContent)
      }
    })
  },

  refresh() {
    session.refresh(this.baseURI, this.requestId)
  }
}
