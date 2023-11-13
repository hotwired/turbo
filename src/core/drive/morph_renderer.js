import Idiomorph from "idiomorph"
import { dispatch } from "../../util"
import { urlsAreEqual } from "../url"
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
    this.isMorphingTurboFrame = this.#remoteFrameReplacement(currentElement, newElement)

    Idiomorph.morph(currentElement, newElement, {
      morphStyle: morphStyle,
      callbacks: {
        beforeNodeAdded: this.#shouldAddElement,
        beforeNodeMorphed: this.#shouldMorphElement,
        beforeNodeRemoved: this.#shouldRemoveElement
      }
    })
  }

  #shouldAddElement = (node) => {
    return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
  }

  #shouldMorphElement = (oldNode, newNode) => {
    if (!(oldNode instanceof HTMLElement) || this.isMorphingTurboFrame) {
      return true
    }
    else if (oldNode.hasAttribute("data-turbo-permanent")) {
      return false
    } else {
      return !this.#remoteFrameReplacement(oldNode, newNode)
    }
  }

  #remoteFrameReplacement = (oldNode, newNode) => {
    return this.#isRemoteFrame(oldNode) && this.#isRemoteFrame(newNode) && urlsAreEqual(oldNode.getAttribute("src"), newNode.getAttribute("src"))
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

  #isRemoteFrame(node) {
    return node instanceof HTMLElement && node.nodeName.toLowerCase() === "turbo-frame" && node.getAttribute("src")
  }

  #remoteFrames() {
    return Array.from(document.querySelectorAll('turbo-frame[src]')).filter(frame => {
      return !frame.closest('[data-turbo-permanent]')
    })
  }
}
