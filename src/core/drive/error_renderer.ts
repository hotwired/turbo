import { PageSnapshot } from "./page_snapshot"
import { Renderer } from "../renderer"

export class ErrorRenderer extends Renderer<PageSnapshot> {
  async render() {
    this.replaceHeadAndBody()
    this.activateScriptElements()
  }

  replaceHeadAndBody() {
    const { documentElement, head, body } = document
    documentElement.replaceChild(this.newHead, head)
    documentElement.replaceChild(this.newElement, body)
  }

  activateScriptElements() {
    for (const replaceableElement of this.scriptElements) {
      const parentNode = replaceableElement.parentNode
      if (parentNode) {
        const element = this.createScriptElement(replaceableElement)
        parentNode.replaceChild(element, replaceableElement)
      }
    }
  }

  get newHead() {
    return this.newSnapshot.headSnapshot.element
  }

  get scriptElements() {
    return [ ...document.documentElement.querySelectorAll("script") ]
  }
}
