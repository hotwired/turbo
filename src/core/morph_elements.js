import { Idiomorph } from "idiomorph/dist/idiomorph.esm.js"
import { dispatch } from "../util"
import { FrameElement } from "../elements/frame_element"

export function morphElements(currentElement, newElement, morphStyle = "outerHTML") {
  const renderer = new Renderer()

  renderer.morph(currentElement, newElement, morphStyle)
}
class Renderer {
  morph(currentElement, newElement, morphStyle) {
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

  isFrameReloadedWithMorph(element) {
    return (element instanceof FrameElement) && element.shouldReloadWithMorph
  }

  shouldAddElement = (node) => {
    return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
  }

  shouldMorphElement = (oldNode, newNode) => {
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

  shouldUpdateAttribute = (attributeName, target, mutationType) => {
    const event = dispatch("turbo:before-morph-attribute", { cancelable: true, target, detail: { attributeName, mutationType } })

    return !event.defaultPrevented
  }

  shouldRemoveElement = (node) => {
    return this.shouldMorphElement(node)
  }

  didMorphElement = (oldNode, newNode) => {
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
