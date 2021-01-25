import { Snapshot } from "./snapshot"

type ResolvingFunctions<T = unknown> = {
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: any): void
}

export abstract class Renderer<S extends Snapshot = Snapshot> {
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

  get currentElement() {
    return this.currentSnapshot.element
  }

  get newElement() {
    return this.newSnapshot.element
  }
}

function copyElementAttributes(destinationElement: Element, sourceElement: Element) {
  for (const { name, value } of [ ...sourceElement.attributes ]) {
    destinationElement.setAttribute(name, value)
  }
}
