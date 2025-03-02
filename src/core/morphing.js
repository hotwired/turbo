import { Idiomorph } from "idiomorph"
import { dispatch } from "../util"

export function morphElements(currentElement, newElement, { callbacks, ...options } = {}) {
  Idiomorph.morph(currentElement, newElement, {
    ...options,
    callbacks: new DefaultIdiomorphCallbacks(callbacks)
  })
}

export function morphChildren(currentElement, newElement) {
  morphElements(currentElement, newElement.childNodes, {
    morphStyle: "innerHTML"
  })
}

class DefaultIdiomorphCallbacks {
  #beforeNodeMorphed

  constructor({ beforeNodeMorphed } = {}) {
    this.#beforeNodeMorphed = beforeNodeMorphed || (() => true)
  }

  beforeNodeAdded = (node) => {
    return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
  }

  beforeNodeMorphed = (currentElement, newElement) => {
    if (currentElement instanceof Element) {
      if (!currentElement.hasAttribute("data-turbo-permanent") && this.#beforeNodeMorphed(currentElement, newElement)) {
        const event = dispatch("turbo:before-morph-element", {
          cancelable: true,
          target: currentElement,
          detail: { currentElement, newElement }
        })

        return !event.defaultPrevented
      } else {
        return false
      }
    }
  }

  beforeAttributeUpdated = (attributeName, target, mutationType) => {
    const event = dispatch("turbo:before-morph-attribute", {
      cancelable: true,
      target,
      detail: { attributeName, mutationType }
    })

    return !event.defaultPrevented
  }

  beforeNodeRemoved = (node) => {
    return this.beforeNodeMorphed(node)
  }

  afterNodeMorphed = (currentElement, newElement) => {
    if (currentElement instanceof Element) {
      dispatch("turbo:morph-element", {
        target: currentElement,
        detail: { currentElement, newElement }
      })
    }
  }
}
