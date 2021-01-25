import { Snapshot } from "./snapshot"

type ResolvingFunctions<T = unknown> = {
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: any): void
}

export abstract class Renderer<S extends Snapshot = Snapshot> {
  readonly fromSnapshot: S
  readonly toSnapshot: S
  readonly isPreview: boolean
  readonly promise: Promise<void>
  private resolvingFunctions?: ResolvingFunctions<void>

  constructor(fromSnapshot: S, toSnapshot: S, isPreview: boolean) {
    this.fromSnapshot = fromSnapshot
    this.toSnapshot = toSnapshot
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

  get fromRootNode() {
    return this.fromSnapshot.rootNode
  }

  get toRootNode() {
    return this.toSnapshot.rootNode
  }
}

function copyElementAttributes(destinationElement: Element, sourceElement: Element) {
  for (const { name, value } of [ ...sourceElement.attributes ]) {
    destinationElement.setAttribute(name, value)
  }
}
