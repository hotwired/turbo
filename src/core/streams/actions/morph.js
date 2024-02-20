import { Idiomorph } from "idiomorph/dist/idiomorph.esm"
import { dispatch } from "../../../util"

export default function morph(streamElement) {
  const morphStyle = streamElement.hasAttribute("children-only") ? "innerHTML" : "outerHTML"
  streamElement.targetElements.forEach((element) => {
    try {
      Idiomorph.morph(element, streamElement.templateContent, {
        morphStyle: morphStyle,
        ignoreActiveValue: true,
        callbacks: {
          beforeNodeAdded,
          beforeNodeMorphed,
          beforeAttributeUpdated,
          beforeNodeRemoved,
          afterNodeMorphed,
        },
      })
    } catch (e) {
      console.error(e)
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
  if (target instanceof HTMLElement && !target.hasAttribute("data-turbo-permanent")) {
    const event = dispatch("turbo:before-morph-element", {
      cancelable: true,
      detail: {
        target,
        newElement,
      },
    })
    return !event.defaultPrevented
  }
  return false
}

function beforeAttributeUpdated(attributeName, target, mutationType) {
  const event = dispatch("turbo:before-morph-attribute", {
    cancelable: true,
    target,
    detail: {
      attributeName,
      mutationType,
    },
  })
  return !event.defaultPrevented
}

function afterNodeMorphed(target, newElement) {
  if (newElement instanceof HTMLElement) {
    dispatch("turbo:morph-element", {
      target,
      detail: {
        newElement,
      },
    })
  }
}
