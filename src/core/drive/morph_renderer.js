import Idiomorph from "idiomorph"
import { nextAnimationFrame } from "../../util"
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

    this.#dispatchEvent("turbo:morph", { currentElement: this.currentElement, newElement: this.newElement })
  }

  #morphElements(currentElement, newElement, morphStyle = "outerHTML") {
    Idiomorph.morph(currentElement, newElement, {
      morphStyle: morphStyle,
      callbacks: {
        beforeNodeMorphed: this.#shouldMorphElement,
        beforeNodeRemoved: this.#shouldRemoveElement,
        afterNodeMorphed: this.#reloadStimulusControllers
      }
    })
  }

  #reloadRemoteFrames() {
    this.#remoteFrames().forEach((frame) => {
      if (this.#isFrameReloadedWithMorph(frame)) {
        this.#renderFrameWithMorph(frame)
      }
      frame.reload()
    })
  }

  #renderFrameWithMorph(frame) {
    frame.addEventListener("turbo:before-frame-render", (event) => {
      event.detail.render = this.#morphFrameUpdate
    }, { once: true })
  }

  #morphFrameUpdate = (currentElement, newElement) => {
    this.#dispatchEvent("turbo:before-frame-morph", { currentElement, newElement }, currentElement)
    this.#morphElements(currentElement, newElement, "innerHTML")
  }

  #shouldRemoveElement = (node) => {
    return this.#shouldMorphElement(node)
  }

  #shouldMorphElement = (node) => {
    if (node instanceof HTMLElement) {
      return !node.hasAttribute("data-turbo-permanent")
    } else {
      return true
    }
  }

  #reloadStimulusControllers = async (node) => {
    if (node instanceof HTMLElement && node.hasAttribute("data-controller")) {
      const originalAttribute = node.getAttribute("data-controller")
      node.removeAttribute("data-controller")
      await nextAnimationFrame()
      node.setAttribute("data-controller", originalAttribute)
    }
  }

  #isFrameReloadedWithMorph(element) {
    return element.getAttribute("src") && element.getAttribute("refresh") === "morph"
  }

  #remoteFrames() {
    return document.querySelectorAll("turbo-frame[src]")
  }

  #dispatchEvent(name, detail, target = document.documentElement) {
    const event = new CustomEvent(name, { bubbles: true, cancelable: true, detail })
    target.dispatchEvent(event)
    return event
  }
}
