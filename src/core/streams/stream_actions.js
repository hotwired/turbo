import { session } from "../"
import { Idiomorph } from "idiomorph/dist/idiomorph.esm.js"
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
  },

  morph() {
    this.targetElements.forEach((targetElement) => {
      try {
        const morphStyle = targetElement.getAttribute("data-turbo-morph-style") || "outerHTML"
        Idiomorph.morph(targetElement, this.templateContent, {
          morphStyle: morphStyle,
          ignoreActiveValue: true,
          callbacks: {
            beforeNodeAdded,
            beforeNodeMorphed,
            beforeAttributeUpdated,
            beforeNodeRemoved,
            afterNodeMorphed
          }
        })

        dispatch("turbo:morph", {
          detail: {
            currentElement: targetElement,
            newElement: this.templateContent
          }
        })
      } catch (error) {
        console.error(error)
      }
    })
  }
}

const beforeNodeAdded = (node) => {
  return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
}

const beforeNodeMorphed = (target, newElement) => {
  if (target instanceof HTMLElement && !target.hasAttribute("data-turbo-permanent")) {
    const event = dispatch("turbo:before-morph-element", {
      cancelable: true,
      detail: {
        target,
        newElement
      }
    })
    return !event.defaultPrevented
  }
  return false
}

const beforeAttributeUpdated = (attributeName, target, mutationType) => {
  const event = dispatch("turbo:before-morph-attribute", {
    cancelable: true,
    target,
    detail: {
      attributeName,
      mutationType
    }
  })
  return !event.defaultPrevented
}

const beforeNodeRemoved = beforeNodeMorphed

const afterNodeMorphed = (target, newElement) => {
  if (newElement instanceof HTMLElement) {
    dispatch("turbo:morph-element", {
      target,
      detail: {
        newElement
      }
    })
  }
}
