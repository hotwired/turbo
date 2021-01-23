import { RenderCallback, RenderDelegate, Renderer } from "./renderer"
import { PageSnapshot } from "./page_snapshot"

export { RenderCallback, RenderDelegate } from "./renderer"

export type PermanentElement = Element & { id: string }

export type Placeholder = { element: Element, permanentElement: PermanentElement }

export class SnapshotRenderer extends Renderer {
  readonly delegate: RenderDelegate
  readonly currentSnapshot: PageSnapshot
  readonly newSnapshot: PageSnapshot
  readonly isPreview: boolean

  static render(delegate: RenderDelegate, callback: RenderCallback, currentSnapshot: PageSnapshot, newSnapshot: PageSnapshot, isPreview: boolean) {
    return new this(delegate, currentSnapshot, newSnapshot, isPreview).render(callback)
  }

  constructor(delegate: RenderDelegate, currentSnapshot: PageSnapshot, newSnapshot: PageSnapshot, isPreview: boolean) {
    super()
    this.delegate = delegate
    this.currentSnapshot = currentSnapshot
    this.newSnapshot = newSnapshot
    this.isPreview = isPreview
  }

  get currentHeadSnapshot() {
    return this.currentSnapshot.headSnapshot
  }

  get newHeadSnapshot() {
    return this.newSnapshot.headSnapshot
  }

  get newBody() {
    return this.newSnapshot.rootNode as HTMLBodyElement
  }

  render(callback: RenderCallback) {
    if (this.shouldRender()) {
      this.mergeHead()
      this.renderView(() => {
        this.replaceBody()
        if (!this.isPreview) {
          this.focusFirstAutofocusableElement()
        }
        callback()
      })
    } else {
      this.invalidateView()
    }
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

  shouldRender() {
    return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical()
  }

  trackedElementsAreIdentical() {
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
      const newElement = this.newSnapshot.getPermanentElementById(permanentElement.id)
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
    document.adoptNode(this.newBody)
    this.activateNewBodyScriptElements()
  }

  activateNewBodyScriptElements() {
    for (const inertScriptElement of this.getNewBodyScriptElements()) {
      const activatedScriptElement = this.createScriptElement(inertScriptElement)
      replaceElementWithElement(inertScriptElement, activatedScriptElement)
    }
  }

  assignNewBody() {
    if (document.body) {
      replaceElementWithElement(document.body, this.newBody)
    } else {
      document.documentElement.appendChild(this.newBody)
    }
  }

  focusFirstAutofocusableElement() {
    const element = this.newSnapshot.firstAutofocusableElement
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
    return this.currentSnapshot.getPermanentElementsPresentInSnapshot(this.newSnapshot)
  }

  getNewBodyScriptElements() {
    return [ ...this.newBody.querySelectorAll("script") ]
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
