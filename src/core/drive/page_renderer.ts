import { Renderer } from "../renderer"
import { PageSnapshot } from "./page_snapshot"
import { ReloadReason } from "../native/browser_adapter"
import { activateScriptElement, waitForLoad } from "../../util"

export class PageRenderer extends Renderer<HTMLBodyElement, PageSnapshot> {
  static renderElement(currentElement: HTMLBodyElement, newElement: HTMLBodyElement) {
    if (document.body && newElement instanceof HTMLBodyElement) {
      document.body.replaceWith(newElement)
    } else {
      document.documentElement.appendChild(newElement)
    }
  }

  get shouldRender() {
    return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical
  }

  get reloadReason(): ReloadReason {
    if (!this.newSnapshot.isVisitable) {
      return {
        reason: "turbo_visit_control_is_reload",
      }
    }

    if (!this.trackedElementsAreIdentical) {
      return {
        reason: "tracked_element_mismatch",
      }
    }
  }

  async prepareToRender() {
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
    // Load new stylesheets and get them to preload before switching out other elements.
    const mergeStylesheets = this.copyNewHeadStylesheetElements() //this.mergeElements("link", false, true);

    this.mergeNonScriptElements()
    this.mergeElements("script", false, (e: Element): Element => {
      return activateScriptElement(e as HTMLScriptElement)
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

  async mergeElements(
    localName: string,
    removeOld = true,
    onAdd = (e: Element): Element => {
      return e
    }
  ) {
    const currentElements: Array<Element> = this.currentHeadSnapshot.getElements(localName)
    const newElements: Array<Element> = [...this.newHeadSnapshot.getElements(localName)]

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
    const currentElements: Array<Element> = this.currentHeadSnapshot.stylesheets
    const newElements: Array<Element> = [...this.newHeadSnapshot.stylesheets]
    for (const currentElement of currentElements) {
      this.isCurrentElementInElementList(currentElement, newElements)
    }
    for (const element of newElements) {
      loadingElements.push(waitForLoad(element as HTMLLinkElement))
      document.head.appendChild(element)
    }
    await Promise.all(loadingElements)
  }

  async mergeNonScriptElements() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { script, ...otherElements } = this.currentSnapshot.headSnapshot.elements
    for (const localName of Object.keys(otherElements)) {
      this.mergeElements(localName)
    }
  }

  isCurrentElementInElementList(element: Element, elementList: Element[]) {
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
