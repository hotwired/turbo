import { Snapshot } from "./snapshot"

type ResolvingFunctions<T = unknown> = {
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: any): void
}

export type PermanentElement = Element & { id: string }

export type Placeholder = { element: Element, permanentElement: PermanentElement }

export abstract class Renderer<E extends Element, S extends Snapshot<E> = Snapshot<E>> {
  readonly currentSnapshot: S
  readonly newSnapshot: S
  readonly isPreview: boolean
  readonly promise: Promise<void>
  private resolvingFunctions?: ResolvingFunctions<void>

  constructor(currentSnapshot: S, newSnapshot: S, isPreview: boolean) {
    this.currentSnapshot = currentSnapshot
    this.newSnapshot = newSnapshot
    this.isPreview = isPreview
    this.promise = new Promise((resolve, reject) => this.resolvingFunctions = { resolve, reject })
  }

  get shouldRender() {
    return true
  }

  prepareToRender() {
    return
  }

  abstract render(): Promise<void>

  finishRendering() {
    if (this.resolvingFunctions) {
      this.resolvingFunctions.resolve()
      delete this.resolvingFunctions
    }
  }

  createScriptElement(element: Element) {
    if (element.getAttribute("data-turbo-eval") == "false") {
      return element
    } else {
      const createdScriptElement = document.createElement("script")
      createdScriptElement.textContent = element.textContent
      createdScriptElement.async = false
      copyElementAttributes(createdScriptElement, element)
      return createdScriptElement
    }
  }

  preservingPermanentElements(callback: () => void) {
    const placeholders = relocatePermanentElements(this.currentSnapshot, this.newSnapshot)
    callback()
    replacePlaceholderElementsWithClonedPermanentElements(placeholders)
  }

  focusFirstAutofocusableElement(snapshot: Snapshot) {
    const element = snapshot.firstAutofocusableElement
    if (elementIsFocusable(element)) {
      element.focus()
    }
  }

  get currentElement() {
    return this.currentSnapshot.element
  }

  get newElement() {
    return this.newSnapshot.element
  }
}

export function replaceElementWithElement(fromElement: Element, toElement: Element) {
  const parentElement = fromElement.parentElement
  if (parentElement) {
    return parentElement.replaceChild(toElement, fromElement)
  }
}

function copyElementAttributes(destinationElement: Element, sourceElement: Element) {
  for (const { name, value } of [ ...sourceElement.attributes ]) {
    destinationElement.setAttribute(name, value)
  }
}

function createPlaceholderForPermanentElement(permanentElement: PermanentElement) {
  const element = document.createElement("meta")
  element.setAttribute("name", "turbo-permanent-placeholder")
  element.setAttribute("content", permanentElement.id)
  return { element, permanentElement }
}

function replacePlaceholderElementsWithClonedPermanentElements(placeholders: Placeholder[]) {
  for (const { element, permanentElement } of placeholders) {
    const clonedElement = permanentElement.cloneNode(true)
    replaceElementWithElement(element, clonedElement)
  }
}

function relocatePermanentElements(currentSnapshot: Snapshot, newSnapshot: Snapshot) {
  return currentSnapshot.getPermanentElementsPresentInSnapshot(newSnapshot).reduce((placeholders, permanentElement) => {
    const newElement = newSnapshot.getPermanentElementById(permanentElement.id)
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

function elementIsFocusable(element: any): element is { focus: () => void } {
  return element && typeof element.focus == "function"
}
