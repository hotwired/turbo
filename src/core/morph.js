import "idiomorph"
import { nextAnimationFrame } from "../util"

export class Morph {
  static render(currentElement, newElement, morphStyle) {
    const morph = new this(currentElement, newElement)

    morph.render(morphStyle)
  }

  constructor(currentElement, newElement) {
    this.currentElement = currentElement
    this.newElement = newElement
  }

  render(morphStyle = "outerHTML") {
    window.Idiomorph.morph(this.currentElement, this.newElement, {
      ignoreActiveValue: true,
      morphStyle: morphStyle,
      callbacks: {
        beforeNodeMorphed: shouldMorphElement,
        beforeNodeRemoved: shouldRemoveElement,
        afterNodeMorphed: reloadStimulusControllers
      }
    })

    this.#remoteFrames.forEach((frame) => frame.reload())
  }

  get #remoteFrames() {
    return this.currentElement.querySelectorAll("turbo-frame[src]")
  }
}

function shouldRemoveElement(node) {
  return shouldMorphElement(node)
}

function shouldMorphElement(node) {
  if (node instanceof HTMLElement) {
    return !node.hasAttribute("data-turbo-permanent")
  } else {
    return true
  }
}

async function reloadStimulusControllers(node) {
  if (node instanceof HTMLElement && node.hasAttribute("data-controller")) {
    const originalAttribute = node.getAttribute("data-controller")
    node.removeAttribute("data-controller")
    await nextAnimationFrame()
    node.setAttribute("data-controller", originalAttribute)
  }
}
