import { activateScriptElement, waitForLoad } from "../../util"
import { Renderer } from "../renderer"

export class PageRenderer extends Renderer {
  static renderElement(currentElement, newElement) {
    if (document.body && newElement instanceof HTMLBodyElement) {
      document.body.replaceWith(newElement)
    } else {
      document.documentElement.appendChild(newElement)
    }
  }

  constructor(currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
    super(currentSnapshot, newSnapshot, renderElement, isPreview)
    this.willRender = willRender
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
    const mergedHeadElements = this.mergeProvisionalElements()
    const newStylesheetElements = this.copyNewHeadStylesheetElements()
    this.copyNewHeadScriptElements()

    await mergedHeadElements
    await newStylesheetElements

    if (this.willRender) {
      this.removeUnusedDynamicStylesheetElements()
    }
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

  async copyNewHeadStylesheetElements() {
    const loadingElements = []

    for (const element of this.newHeadStylesheetElements) {
      loadingElements.push(waitForLoad(element))

      document.head.appendChild(element)
    }

    await Promise.all(loadingElements)
  }

  copyNewHeadScriptElements() {
    for (const element of this.newHeadScriptElements) {
      document.head.appendChild(activateScriptElement(element))
    }
  }

  removeUnusedDynamicStylesheetElements() {
    for (const element of this.unusedDynamicStylesheetElements) {
      document.head.removeChild(element)
    }
  }

  async mergeProvisionalElements() {
    const newHeadElements = [...this.newHeadProvisionalElements]

    for (const element of this.currentHeadProvisionalElements) {
      if (!this.isCurrentElementInElementList(element, newHeadElements)) {
        document.head.removeChild(element)
      }
    }

    for (const element of newHeadElements) {
      document.head.appendChild(element)
    }
  }

  isCurrentElementInElementList(element, elementList) {
    for (const [index, newElement] of elementList.entries()) {
      // if title element...
      if (element.tagName == "TITLE") {
        if (newElement.tagName != "TITLE") {
          continue
        }
        if (element.innerHTML == newElement.innerHTML) {
          elementList.splice(index, 1)
          return true
        }
      }

      // if any other element...
      if (newElement.isEqualNode(element)) {
        elementList.splice(index, 1)
        return true
      }
    }

    return false
  }

  removeCurrentHeadProvisionalElements() {
    for (const element of this.currentHeadProvisionalElements) {
      document.head.removeChild(element)
    }
  }

  copyNewHeadProvisionalElements() {
    for (const element of this.newHeadProvisionalElements) {
      document.head.appendChild(element)
    }
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

  get unusedDynamicStylesheetElements() {
    return this.oldHeadStylesheetElements.filter((element) => {
      return element.getAttribute("data-turbo-track") === "dynamic"
    })
  }

  get oldHeadStylesheetElements() {
    return this.currentHeadSnapshot.getStylesheetElementsNotInSnapshot(this.newHeadSnapshot)
  }

  get newHeadStylesheetElements() {
    return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  get newHeadScriptElements() {
    return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  get currentHeadProvisionalElements() {
    return this.currentHeadSnapshot.provisionalElements
  }

  get newHeadProvisionalElements() {
    return this.newHeadSnapshot.provisionalElements
  }

  get newBodyScriptElements() {
    return this.newElement.querySelectorAll("script")
  }
}
