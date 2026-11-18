import { activateScriptElement, elementIsStylesheet, waitForLoad } from "../../util"
import { Renderer } from "../renderer"

export class PageRenderer extends Renderer {
  static renderElement(currentElement, newElement) {
    if (document.body && newElement instanceof HTMLBodyElement) {
      document.body.replaceWith(newElement)
    } else {
      document.documentElement.appendChild(newElement)
    }
  }

  get shouldRender() {
    return this.newSnapshot.isVisitable && this.#hasCompatibleTrackedElements
  }

  get reloadReason() {
    if (!this.newSnapshot.isVisitable) {
      return {
        reason: "turbo_visit_control_is_reload"
      }
    }

    if (!this.#hasCompatibleTrackedElements) {
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
    if (this.willRender) {
      const newHeadElements = [...this.newHeadProvisionalElements]

      for (const element of this.currentHeadProvisionalElements) {
        if (!this.isCurrentElementInElementList(element, newHeadElements)) {
          document.head.removeChild(element)
        }
      }

      for (const element of newHeadElements) {
        document.head.appendChild(element)
      }
    } else {
      this.#mergePartialProvisionalElements()
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
    this.deactivateNoscriptStylesheetElements()
    this.activateNewBodyScriptElements()
  }

  deactivateNoscriptStylesheetElements() {
    for (const noscriptElement of this.newElement.querySelectorAll("noscript")) {
      for (const child of [...noscriptElement.children]) {
        if (elementIsStylesheet(child)) {
          child.remove()
        }
      }
    }
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

  // Private

  get #hasCompatibleTrackedElements() {
    if (this.willRender) {
      return this.trackedElementsAreIdentical
    } else {
      const currentElements = this.currentHeadSnapshot.detailsByOuterHTML
      return Object.entries(this.newHeadSnapshot.detailsByOuterHTML).every(([outerHTML, { tracked }]) => {
        return !tracked || outerHTML in currentElements
      })
    }
  }

  #setLanguage() {
    const { documentElement } = this.currentSnapshot
    const { dir, lang } = this.newSnapshot

    if (lang || (!this.willRender && lang !== null)) {
      documentElement.setAttribute("lang", lang)
    } else if (this.willRender) {
      documentElement.removeAttribute("lang")
    }
    if (dir || (!this.willRender && dir !== null)) {
      documentElement.setAttribute("dir", dir)
    } else if (this.willRender) {
      documentElement.removeAttribute("dir")
    }
  }

  #mergePartialProvisionalElements() {
    const currentElements = this.#getProvisionalElementsInDocumentOrder(this.currentHeadSnapshot)
    const suppliedElements = this.#getProvisionalElementsInDocumentOrder(this.newHeadSnapshot)
    const unusedElements = [...currentElements]
    const mergedElements = suppliedElements.map((element) => {
      const index = unusedElements.findIndex((currentElement) => currentElement.isEqualNode(element))
      return index < 0 ? element : unusedElements.splice(index, 1)[0]
    })

    for (const element of unusedElements) {
      if (suppliedElements.some((suppliedElement) => this.#hasSameProvisionalElementIdentity(element, suppliedElement))) {
        document.head.removeChild(element)
      }
    }

    const currentSuppliedElements = currentElements.filter((element) => mergedElements.includes(element))
    const hasCorrectOrder = currentSuppliedElements.length === mergedElements.length &&
      currentSuppliedElements.every((element, index) => element === mergedElements[index])

    if (!hasCorrectOrder) {
      for (const element of mergedElements) {
        document.head.appendChild(element)
      }
    }
  }

  #getProvisionalElementsInDocumentOrder(headSnapshot) {
    const elements = headSnapshot.provisionalElements
    return headSnapshot.children.filter((element) => elements.includes(element))
  }

  #hasSameProvisionalElementIdentity(element, otherElement) {
    if (element.tagName === otherElement.tagName) {
      switch (element.tagName) {
        case "TITLE":
        case "BASE":
          return true
        case "META": {
          const attribute = ["name", "property", "http-equiv", "itemprop"].find((name) => {
            return element.hasAttribute(name) && otherElement.hasAttribute(name)
          })
          let hasSameName
          if (attribute === "http-equiv") {
            hasSameName = element.httpEquiv.toLowerCase() === otherElement.httpEquiv.toLowerCase()
          } else if (attribute) {
            hasSameName = element.getAttribute(attribute) === otherElement.getAttribute(attribute)
          } else {
            hasSameName = element.hasAttribute("charset") && otherElement.hasAttribute("charset")
          }
          return hasSameName && (element.getAttribute("media") || "") === (otherElement.getAttribute("media") || "")
        }
        case "LINK": {
          const relations = [...element.relList].map((relation) => relation.toLowerCase())
          const otherRelations = [...otherElement.relList].map((relation) => relation.toLowerCase())
          if (["canonical", "manifest"].some((relation) => relations.includes(relation) && otherRelations.includes(relation))) {
            return true
          } else if (relations.includes("icon") && otherRelations.includes("icon")) {
            return ["type", "sizes", "media"].every((name) => {
              return (element.getAttribute(name) || "") === (otherElement.getAttribute(name) || "")
            })
          }
        }
      }
    }
    return false
  }
}
