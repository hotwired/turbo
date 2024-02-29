import { dispatch } from "../../util"
import { PageRenderer } from "./page_renderer"
import { MorphElements } from "../morph_elements"

export class MorphPageRenderer extends PageRenderer {
  async render() {
    if (this.willRender) await this.#morphBody()
  }

  get renderMethod() {
    return "morph"
  }

  // Private

  async #morphBody() {
    MorphElements.morph(this.currentElement, this.newElement)
    this.#reloadRemoteFrames()

    dispatch("turbo:morph", {
      detail: {
        currentElement: this.currentElement,
        newElement: this.newElement
      }
    })
  }

  #reloadRemoteFrames() {
    this.#remoteFrames().forEach((frame) => {
      if (frame.shouldReloadWithMorph) {
        frame.reload()
      }
    })
  }

  #remoteFrames() {
    return Array.from(document.querySelectorAll('turbo-frame[src]')).filter(frame => {
      return !frame.closest('[data-turbo-permanent]')
    })
  }
}
