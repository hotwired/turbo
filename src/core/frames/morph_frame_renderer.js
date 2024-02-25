import { FrameRenderer } from "./frame_renderer"
import { MorphPageRenderer } from "../drive/morph_page_renderer"

export class MorphFrameRenderer extends FrameRenderer {
  static renderElement(currentElement, newElement) {
    MorphPageRenderer.renderElement(currentElement, newElement.children)

    // console.log(`dispatching turbo:before-frame-morph on `, currentElement.id)
    // console.log(`and new = `, newElement.id)
    // console.log(`and children = `, newElement.children)

    // const morphStyle = 'innerHTML'

    // dispatch("turbo:before-frame-morph", {
    //   target: currentElement,
    //   detail: { currentElement, newElement }
    // })

    // this.isMorphingTurboFrame = this.#isFrameReloadedWithMorph(currentElement)

    // Idiomorph.morph(currentElement, newElement, {
    //   ignoreActiveValue: true,
    //   morphStyle: morphStyle,
    //   callbacks: {
    //     beforeNodeAdded: this.#shouldAddElement,
    //     beforeNodeMorphed: this.#shouldMorphElement,
    //     beforeAttributeUpdated: this.#shouldUpdateAttribute,
    //     beforeNodeRemoved: this.#shouldRemoveElement,
    //     afterNodeMorphed: this.#didMorphElement
    //   }
    // })
  }

  static #isFrameReloadedWithMorph(element) {
    return element.src && element.refresh === "morph"
  }

  static #shouldAddElement = (node) => {
    return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
  }

  static #shouldMorphElement = (oldNode, newNode) => {
    if (!(oldNode instanceof HTMLElement)) return

    if (oldNode.hasAttribute("data-turbo-permanent")) return false

    if (!this.isMorphingTurboFrame && this.#isFrameReloadedWithMorph(oldNode)) return false

    const event = dispatch("turbo:before-morph-element", {
      cancelable: true,
      target: oldNode,
      detail: {
        newElement: newNode
      }
    })

    return !event.defaultPrevented
  }

  static #shouldUpdateAttribute = (attributeName, target, mutationType) => {
    const event = dispatch("turbo:before-morph-attribute", { cancelable: true, target, detail: { attributeName, mutationType } })

    return !event.defaultPrevented
  }

  static #shouldRemoveElement = (node) => {
    return this.#shouldMorphElement(node)
  }

  static #didMorphElement = (oldNode, newNode) => {
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
