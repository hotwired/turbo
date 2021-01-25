import { Renderer } from "../renderer"
import { PageSnapshot } from "./page_snapshot"

export type PermanentElement = Element & { id: string }

export type Placeholder = { element: Element, permanentElement: PermanentElement }

export class PageRenderer extends Renderer<PageSnapshot> {
  get shouldRender() {
    return this.toSnapshot.isVisitable && this.trackedElementsAreIdentical
  }

  prepareToRender() {
    this.mergeHead()
  }

  async render() {
    this.replaceBody()
  }

  finishRendering() {
    super.finishRendering()
    if (this.isPreview) {
      this.focusFirstAutofocusableElement()
    }
  }

  get currentHeadSnapshot() {
    return this.fromSnapshot.headSnapshot
  }

  get newHeadSnapshot() {
    return this.toSnapshot.headSnapshot
  }

  get toRootNode() {
    return this.toSnapshot.rootNode
  }

  mergeHead() {
    this.copyNewHeadStylesheetElements()
    this.copyNewHeadScriptElements()
    this.removeCurrentHeadProvisionalElements()
    this.copyNewHeadProvisionalElements()
  }

  replaceBody() {
    const placeholders = this.relocateCurrentBodyPermanentElements()
    this.activateNewBody()
    this.assignNewBody()
    this.replacePlaceholderElementsWithClonedPermanentElements(placeholders)
  }

  get trackedElementsAreIdentical() {
    return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature
  }

  copyNewHeadStylesheetElements() {
    for (const element of this.getNewHeadStylesheetElements()) {
      document.head.appendChild(element)
    }
  }

  copyNewHeadScriptElements() {
    for (const element of this.getNewHeadScriptElements()) {
      document.head.appendChild(this.createScriptElement(element))
    }
  }

  removeCurrentHeadProvisionalElements() {
    for (const element of this.getCurrentHeadProvisionalElements()) {
      document.head.removeChild(element)
    }
  }

  copyNewHeadProvisionalElements() {
    for (const element of this.getNewHeadProvisionalElements()) {
      document.head.appendChild(element)
    }
  }

  relocateCurrentBodyPermanentElements() {
    return this.getCurrentBodyPermanentElements().reduce((placeholders, permanentElement) => {
      const newElement = this.toSnapshot.getPermanentElementById(permanentElement.id)
      if (newElement) {
        const placeholder = createPlaceholderForPermanentElement(permanentElement)
        replaceElementWithElement(permanentElement, placeholder.element)
        replaceElementWithElement(newElement, permanentElement)
        return [ ...placeholders, placeholder ]
      } else {
        return placeholders
      }
    }, [] as Placeholder[])
  }

  replacePlaceholderElementsWithClonedPermanentElements(placeholders: Placeholder[]) {
    for (const { element, permanentElement } of placeholders) {
      const clonedElement = permanentElement.cloneNode(true)
      replaceElementWithElement(element, clonedElement)
    }
  }

  activateNewBody() {
    document.adoptNode(this.toRootNode)
    this.activateNewBodyScriptElements()
  }

  activateNewBodyScriptElements() {
    for (const inertScriptElement of this.getNewBodyScriptElements()) {
      const activatedScriptElement = this.createScriptElement(inertScriptElement)
      replaceElementWithElement(inertScriptElement, activatedScriptElement)
    }
  }

  assignNewBody() {
    if (document.body && this.toRootNode instanceof HTMLBodyElement) {
      replaceElementWithElement(document.body, this.toRootNode)
    } else {
      document.documentElement.appendChild(this.toRootNode)
    }
  }

  focusFirstAutofocusableElement() {
    const element = this.toSnapshot.firstAutofocusableElement
    if (elementIsFocusable(element)) {
      element.focus()
    }
  }

  getNewHeadStylesheetElements() {
    return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  getNewHeadScriptElements() {
    return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  getCurrentHeadProvisionalElements() {
    return this.currentHeadSnapshot.provisionalElements
  }

  getNewHeadProvisionalElements() {
    return this.newHeadSnapshot.provisionalElements
  }

  getCurrentBodyPermanentElements(): PermanentElement[] {
    return this.fromSnapshot.getPermanentElementsPresentInSnapshot(this.toSnapshot)
  }

  getNewBodyScriptElements() {
    return [ ...this.toRootNode.querySelectorAll("script") ]
  }
}

function createPlaceholderForPermanentElement(permanentElement: PermanentElement) {
  const element = document.createElement("meta")
  element.setAttribute("name", "turbo-permanent-placeholder")
  element.setAttribute("content", permanentElement.id)
  return { element, permanentElement }
}

function replaceElementWithElement(fromElement: Element, toElement: Element) {
  const parentElement = fromElement.parentElement
  if (parentElement) {
    return parentElement.replaceChild(toElement, fromElement)
  }
}

function elementIsFocusable(element: any): element is { focus: () => void } {
  return element && typeof element.focus == "function"
}
