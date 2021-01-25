import { Renderer, focusFirstAutofocusableElement, replaceElementWithElement, renderSnapshotWithPermanentElements } from "../renderer"
import { PageSnapshot } from "./page_snapshot"

export class PageRenderer extends Renderer<HTMLBodyElement, PageSnapshot> {
  get shouldRender() {
    return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical
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
      focusFirstAutofocusableElement(this.newSnapshot)
    }
  }

  get newElement() {
    return this.newSnapshot.element
  }

  private get currentHeadSnapshot() {
    return this.currentSnapshot.headSnapshot
  }

  private get newHeadSnapshot() {
    return this.newSnapshot.headSnapshot
  }

  private mergeHead() {
    this.copyNewHeadStylesheetElements()
    this.copyNewHeadScriptElements()
    this.removeCurrentHeadProvisionalElements()
    this.copyNewHeadProvisionalElements()
  }

  private replaceBody() {
    renderSnapshotWithPermanentElements(this.currentSnapshot, this.newSnapshot, () => {
      this.activateNewBody()
      this.assignNewBody()
    })
  }

  private get trackedElementsAreIdentical() {
    return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature
  }

  private copyNewHeadStylesheetElements() {
    for (const element of this.newHeadStylesheetElements) {
      document.head.appendChild(element)
    }
  }

  private copyNewHeadScriptElements() {
    for (const element of this.newHeadScriptElements) {
      document.head.appendChild(this.createScriptElement(element))
    }
  }

  private removeCurrentHeadProvisionalElements() {
    for (const element of this.currentHeadProvisionalElements) {
      document.head.removeChild(element)
    }
  }

  private copyNewHeadProvisionalElements() {
    for (const element of this.newHeadProvisionalElements) {
      document.head.appendChild(element)
    }
  }

  private activateNewBody() {
    document.adoptNode(this.newElement)
    this.activateNewBodyScriptElements()
  }

  private activateNewBodyScriptElements() {
    for (const inertScriptElement of this.newBodyScriptElements) {
      const activatedScriptElement = this.createScriptElement(inertScriptElement)
      replaceElementWithElement(inertScriptElement, activatedScriptElement)
    }
  }

  private assignNewBody() {
    if (document.body && this.newElement instanceof HTMLBodyElement) {
      replaceElementWithElement(document.body, this.newElement)
    } else {
      document.documentElement.appendChild(this.newElement)
    }
  }

  private get newHeadStylesheetElements() {
    return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  private get newHeadScriptElements() {
    return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  private get currentHeadProvisionalElements() {
    return this.currentHeadSnapshot.provisionalElements
  }

  private get newHeadProvisionalElements() {
    return this.newHeadSnapshot.provisionalElements
  }

  private get newBodyScriptElements() {
    return [ ...this.newElement.querySelectorAll("script") ]
  }
}
