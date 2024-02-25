import { Idiomorph } from "idiomorph/dist/idiomorph.esm.js"
import { dispatch } from "../util"

export class MorphElements {
  static morph(currentElement, newElement, morphStyle = "outerHTML") {
    this.isMorphingTurboFrame = this.isFrameReloadedWithMorph(currentElement)

    Idiomorph.morph(currentElement, newElement, {
      morphStyle: morphStyle,
      callbacks: {
        beforeNodeAdded: this.shouldAddElement,
        beforeNodeMorphed: this.shouldMorphElement,
        beforeAttributeUpdated: this.shouldUpdateAttribute,
        beforeNodeRemoved: this.shouldRemoveElement,
        afterNodeMorphed: this.didMorphElement
      }
    })
  }

  static isFrameReloadedWithMorph(element) {
    return element.src && element.refresh === "morph"
  }

  static shouldAddElement = (node) => {
    return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
  }

  static shouldMorphElement = (oldNode, newNode) => {
    if (!(oldNode instanceof HTMLElement)) return

    if (oldNode.hasAttribute("data-turbo-permanent")) return false

    if (!this.isMorphingTurboFrame && this.isFrameReloadedWithMorph(oldNode)) return false

    const event = dispatch("turbo:before-morph-element", {
      cancelable: true,
      target: oldNode,
      detail: {
        newElement: newNode
      }
    })

    return !event.defaultPrevented
  }

  static shouldUpdateAttribute = (attributeName, target, mutationType) => {
    const event = dispatch("turbo:before-morph-attribute", { cancelable: true, target, detail: { attributeName, mutationType } })

    return !event.defaultPrevented
  }

  static shouldRemoveElement = (node) => {
    return this.shouldMorphElement(node)
  }

  static didMorphElement = (oldNode, newNode) => {
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
