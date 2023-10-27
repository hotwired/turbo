import Idiomorph from "idiomorph"
import { dispatch, nextAnimationFrame } from "../../util"
import { Renderer } from "../renderer"

export class MorphRenderer extends Renderer {
  async render() {
    if (this.willRender) await this.#morphBody()
  }

  get renderMethod() {
    return "morph"
  }

  // Private

  async #morphBody() {
    this.#morphElements(this.currentElement, this.newElement)
    this.#reloadRemoteFrames()

    dispatch("turbo:morph", {
      detail: {
        currentElement: this.currentElement,
        newElement: this.newElement
      }
    })
  }

  #morphElements(currentElement, newElement, morphStyle = "outerHTML") {
    this.isMorphingTurboFrame = this.#isRemoteFrame(currentElement)

    Idiomorph.morph(currentElement, newElement, {
      morphStyle: morphStyle,
      callbacks: {
        beforeNodeAdded: this.#shouldAddElement,
        beforeNodeMorphed: this.#shouldMorphElement,
        beforeNodeRemoved: this.#shouldRemoveElement,
        afterNodeMorphed: this.#reloadStimulusControllers
      }
    })
  }

  #shouldAddElement = (node) => {
    return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
  }

  #shouldMorphElement = (node) => {
    if (node instanceof HTMLElement) {
      return !node.hasAttribute("data-turbo-permanent") && (this.isMorphingTurboFrame || !this.#isRemoteFrame(node))
    } else {
      return true
    }
  }

  #shouldRemoveElement = (node) => {
    return this.#shouldMorphElement(node)
  }

  #reloadRemoteFrames() {
    this.#remoteFrames().forEach((frame) => {
      if (this.#isRemoteFrame(frame)) {
        this.#renderFrameWithMorph(frame)
        frame.reload()
      }
    })
  }

  #renderFrameWithMorph(frame) {
    frame.addEventListener("turbo:before-frame-render", (event) => {
      event.detail.render = this.#morphFrameUpdate
    }, { once: true })
  }

  #morphFrameUpdate = (currentElement, newElement) => {
    dispatch("turbo:before-frame-morph", {
      target: currentElement,
      detail: { currentElement, newElement }
    })
    this.#morphElements(currentElement, newElement.children, "innerHTML")
  }

  #reloadStimulusControllers = async (node) => {
    if (node instanceof HTMLElement && node.hasAttribute("data-controller")) {
      const originalAttribute = node.getAttribute("data-controller")
      node.removeAttribute("data-controller")
      await nextAnimationFrame()
      node.setAttribute("data-controller", originalAttribute)
    }
  }

  #isRemoteFrame(element) {
    return element.nodeName.toLowerCase() === "turbo-frame" && element.src
  }

  #remoteFrames() {
    return Array.from(document.querySelectorAll('turbo-frame[src]')).filter(frame => {
      return !frame.closest('[data-turbo-permanent]')
    })
  }
}
