import { activateScriptElement } from "../../util"
import { Renderer } from "../renderer"
import type { PageSnapshot } from "./page_snapshot"

export class ErrorRenderer extends Renderer<HTMLBodyElement, PageSnapshot> {
  static renderElement(_currentElement: Element, newElement: Element): void {
    const { documentElement, body } = document

    documentElement.replaceChild(newElement, body)
  }

  async render(): Promise<void> {
    this.#setLanguage()
    this.replaceHeadAndBody()
    this.activateScriptElements()
  }

  replaceHeadAndBody(): void {
    const { documentElement, head } = document
    documentElement.replaceChild(this.newHead, head)
    this.renderElement(this.currentElement, this.newElement)
  }

  activateScriptElements(): void {
    for (const replaceableElement of this.scriptElements) {
      const parentNode = replaceableElement.parentNode
      if (parentNode) {
        const element = activateScriptElement(replaceableElement)
        parentNode.replaceChild(element, replaceableElement)
      }
    }
  }

  get newHead(): HTMLHeadElement {
    return this.newSnapshot.headSnapshot.element
  }

  get scriptElements(): NodeListOf<HTMLScriptElement> {
    return document.documentElement.querySelectorAll("script")
  }

  // Private

  #setLanguage(): void {
    const { documentElement } = this.currentSnapshot

    for (const attribute of ["lang", "dir"] as const) {
      const value = this.newSnapshot[attribute]
      if (value) {
        documentElement.setAttribute(attribute, value)
      } else {
        documentElement.removeAttribute(attribute)
      }
    }
  }
}
