import { session } from "../"
import { morph } from "idiomorph"
import { dispatch } from "../../util"


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
  }

  morph() {
    this.targetElements.forEach((targetElement) => {
      try {
        const morphStyle = this.getAttribute("data-turbo-morph-style") || "outerHTML"
        const ignoreActive = this.getAttribute("data-turbo-morph-ignore-active") || true
        const ignoreActiveValue  = this.getAttribute("data-turbo-morph-ignore-active-value") || true
        const head = this.getAttribute("data-turbo-morph-head") || 'merge'
        morph(targetElement, this.templateContent, {
          morphStyle: morphStyle,
          ignoreActive: ignoreActive,
          ignoreActiveValue: ignoreActiveValue,
          head: head,
          callbacks: {
            beforeNodeAdded: (node) => {
              return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
            },
            afterNodeMorphed: (oldNode, newNode) => {
              if (newNode instanceof HTMLElement) {
                dispatch("turbo:morph-element", {
                  target: oldNode,
                  detail: {
                    newElement: newNode
                  }
                })
              }
            }
          }
        })
      } catch (error) {
        console.error(error)
      }
    })
  }
}
