import { Renderer } from "../renderer"
import { activateScriptElement, waitForLoad } from "../../util"

export class PageRenderer extends Renderer {
  static renderElement(currentElement, newElement) {
    if (document.body && newElement instanceof HTMLBodyElement) {
      document.body.replaceWith(newElement)
    } else {
      document.documentElement.appendChild(newElement)
    }
  }

  get shouldRender() {
    return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical
  }

  get reloadReason() {
    if (!this.newSnapshot.isVisitable) {
      return {
        reason: "turbo_visit_control_is_reload"
      }
    }

    if (!this.trackedElementsAreIdentical) {
      return {
        reason: "tracked_element_mismatch"
      }
    }
  }

  async prepareToRender() {
    this.#setLanguage()
    await this.mergeHead()
  }

  async render() {
    if (this.willRender) {
      await this.replaceBody()
    }
  }

  finishRendering() {
    super.finishRendering()
    if (!this.isPreview) {
      this.focusFirstAutofocusableElement()
    }
  }

  get currentHeadSnapshot() {
    return this.currentSnapshot.headSnapshot
  }

  get newHeadSnapshot() {
    return this.newSnapshot.headSnapshot
  }

  get newElement() {
    return this.newSnapshot.element
  }

  #setLanguage() {
    const { documentElement } = this.currentSnapshot
    const { lang } = this.newSnapshot

    if (lang) {
      documentElement.setAttribute("lang", lang)
    } else {
      documentElement.removeAttribute("lang")
    }
  }

  async mergeHead() {
    // Load new stylesheets and get them to preload before switching out other elements.
    const mergeStylesheets = this.copyNewHeadStylesheetElements()
    this.mergeNonScriptElements()
    this.mergeElements("script", false, (e) => {
      return activateScriptElement(e)
    })

    await mergeStylesheets
  }

  async replaceBody() {
    await this.preservingPermanentElements(async () => {
      this.activateNewBody()
      await this.assignNewBody()
    })
  }

  get trackedElementsAreIdentical() {
    return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature
  }

  async mergeElements(localName, removeOld = true, onAdd = (e) => {return e}) {
    const currentElements = this.currentHeadSnapshot.getElements(localName)
    const newElements = [...this.newHeadSnapshot.getElements(localName)]

    for (const currentElement of currentElements) {
      if (!this.isCurrentElementInElementList(currentElement, newElements)) {
        if (removeOld) document.head.removeChild(currentElement)
      }
    }
    for (const element of newElements) {
      document.head.appendChild(onAdd(element))
    }
  }

  async copyNewHeadStylesheetElements() {
    const loadingElements = []
    const currentElements = this.currentHeadSnapshot.stylesheets
    const newElements = [...this.newHeadSnapshot.stylesheets]

    for (const currentElement of currentElements) {
      this.isCurrentElementInElementList(currentElement, newElements)
    }

    for (const element of newElements) {
      loadingElements.push(waitForLoad(element))
      document.head.appendChild(element)
    }
    await Promise.all(loadingElements)
  }

  async mergeNonScriptElements() {
    // eslint-disable-next-line no-unused-vars
    const { script, ...otherElements } = this.currentSnapshot.headSnapshot.elements
    for (const localName of Object.keys(otherElements)) {
      this.mergeElements(localName)
    }
  }

  isCurrentElementInElementList(element, elementList) {
    // removes element from list and returns true if in list
    for (const [index, newElement] of elementList.entries()) {
      if (newElement.isEqualNode(element)) {
        elementList.splice(index, 1)
        return true
      }
    }
    return false
  }

  activateNewBody() {
    document.adoptNode(this.newElement)
    this.activateNewBodyScriptElements()
  }

  activateNewBodyScriptElements() {
    for (const inertScriptElement of this.newBodyScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  async assignNewBody() {
    await this.renderElement(this.currentElement, this.newElement)
  }

  get newBodyScriptElements() {
    return this.newElement.querySelectorAll("script")
  }
}
