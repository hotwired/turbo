import { Idiomorph } from "idiomorph/dist/idiomorph.esm"
import { dispatch } from "../../../util"

export function morphElement(target, element) {
  idiomorph(target, element, { morphStyle: "outerHTML" })
}

export function morphChildren(target, childElements) {
  idiomorph(target, childElements, { morphStyle: "innerHTML" })
}

function idiomorph(target, element, options = {}) {
  Idiomorph.morph(target, element, {
    ...options,
    callbacks: {
      beforeNodeAdded,
      beforeNodeMorphed,
      beforeAttributeUpdated,
      beforeNodeRemoved,
      afterNodeMorphed
    }
  })
}

function beforeNodeAdded(node) {
  return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
}

function beforeNodeRemoved(node) {
  return beforeNodeAdded(node)
}

function beforeNodeMorphed(target, newElement) {
  if (target instanceof HTMLElement) {
    if (!target.hasAttribute("data-turbo-permanent")) {
      const event = dispatch("turbo:before-morph-element", {
        cancelable: true,
        target,
        detail: {
          newElement
        }
      })
      return !event.defaultPrevented
    }
    return false
  }
}

function beforeAttributeUpdated(attributeName, target, mutationType) {
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

function afterNodeMorphed(target, newElement) {
  if (newElement instanceof HTMLElement) {
    dispatch("turbo:morph-element", {
      target,
      detail: {
        newElement
      }
    })
  }
}
