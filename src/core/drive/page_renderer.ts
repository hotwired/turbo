import { Renderer } from "../renderer"
import { PageSnapshot } from "./page_snapshot"
import { ReloadReason } from "../native/browser_adapter"
import { activateScriptElement, waitForLoad, getBodyElementId } from "../../util"

export class PageRenderer extends Renderer<HTMLBodyElement, PageSnapshot> {
  static renderElement(currentBody: HTMLBodyElement, newBody: HTMLBodyElement) {
    if (document.body && newBody instanceof HTMLBodyElement) {
      const currentElement = PageRenderer.getRenderedElement(currentBody) || currentBody
      const newElement = PageRenderer.getRenderedElement(newBody) || newBody

      currentElement.replaceWith(newElement)
    } else {
      document.documentElement.appendChild(newBody)
    }
  }

  get shouldRender() {
    return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical && this.renderedElementMatches
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

    if (!this.renderedElementMatches) {
      return {
        reason: "rendered_element_mismatch",
      }
    }
  }

  async prepareToRender() {
    await this.mergeHead()
  }

  async render() {
    if (this.willRender) {
      this.replaceBody()
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
    const newStylesheetElements = this.copyNewHeadStylesheetElements()
    this.copyNewHeadScriptElements()
    this.removeCurrentHeadProvisionalElements()
    this.copyNewHeadProvisionalElements()
    await newStylesheetElements
  }

  replaceBody() {
    this.preservingPermanentElements(() => {
      this.activateNewBody()
      this.assignNewBody()
    })
  }

  get trackedElementsAreIdentical() {
    return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature
  }

  get renderedElementMatches() {
    return PageRenderer.getRenderedElement(this.newElement) !== null
  }

  static get bodySelector() {
    const bodyId = getBodyElementId()

    return bodyId ? `#${bodyId}` : "body"
  }

  static getRenderedElement(element: HTMLElement): HTMLElement | null {
    if (element.matches(this.bodySelector)) {
      return element
    } else {
      return element.querySelector(this.bodySelector)
    }
  }

  async copyNewHeadStylesheetElements() {
    const loadingElements = []

    for (const element of this.newHeadStylesheetElements) {
      loadingElements.push(waitForLoad(element as HTMLLinkElement))

      document.head.appendChild(element)
    }

    await Promise.all(loadingElements)
  }

  copyNewHeadScriptElements() {
    for (const element of this.newHeadScriptElements) {
      document.head.appendChild(activateScriptElement(element))
    }
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

  assignNewBody() {
    this.renderElement(this.currentElement, this.newElement)
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
