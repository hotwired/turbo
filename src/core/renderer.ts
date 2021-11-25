import { Bardo } from "./bardo"
import { Snapshot } from "./snapshot"

type ResolvingFunctions<T = unknown> = {
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: any): void
}

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
      if (this.cspNonce) {
        createdScriptElement.nonce = this.cspNonce
      }
      createdScriptElement.textContent = element.textContent
      createdScriptElement.async = false
      copyElementAttributes(createdScriptElement, element)
      return createdScriptElement
    }
  }

  preservingPermanentElements(callback: () => void) {
    Bardo.preservingPermanentElements(this.permanentElementMap, callback)
  }

  focusFirstAutofocusableElement() {
    const element = this.connectedSnapshot.firstAutofocusableElement
    if (elementIsFocusable(element)) {
      element.focus()
    }
  }

  get connectedSnapshot() {
    return this.newSnapshot.isConnected ? this.newSnapshot : this.currentSnapshot
  }

  get currentElement() {
    return this.currentSnapshot.element
  }

  get newElement() {
    return this.newSnapshot.element
  }

  get permanentElementMap() {
    return this.currentSnapshot.getPermanentElementMapForSnapshot(this.newSnapshot)
  }

  get cspNonce() {
    return document.head.querySelector('meta[name="csp-nonce"]')?.getAttribute("content")
  }
}

function copyElementAttributes(destinationElement: Element, sourceElement: Element) {
  for (const { name, value } of [ ...sourceElement.attributes ]) {
    destinationElement.setAttribute(name, value)
  }
}

function elementIsFocusable(element: any): element is { focus: () => void } {
  return element && typeof element.focus == "function"
}
