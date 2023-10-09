import { activateScriptElement } from "../../util"
import { Renderer } from "../renderer"

export class ErrorRenderer extends Renderer {
  static renderElement(currentElement, newElement) {
    ErrorRenderer.replace(currentElement, newElement)
  }

  static replace(currentElement, newElement) {
    const { documentElement, body } = document

    documentElement.replaceChild(newElement, body)
  }

  async render() {
    this.replaceHeadAndBody()
    this.activateScriptElements()
  }

  replaceHeadAndBody() {
    const { documentElement, head } = document
    documentElement.replaceChild(this.newHead, head)
    this.renderElement(this.currentElement, this.newElement)
  }

  activateScriptElements() {
    for (const replaceableElement of this.scriptElements) {
      const parentNode = replaceableElement.parentNode
      if (parentNode) {
        const element = activateScriptElement(replaceableElement)
        parentNode.replaceChild(element, replaceableElement)
      }
    }
  }

  get newHead() {
    return this.newSnapshot.headSnapshot.element
  }

  get scriptElements() {
    return document.documentElement.querySelectorAll("script")
  }
}
