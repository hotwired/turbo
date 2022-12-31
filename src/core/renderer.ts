import { Bardo, BardoDelegate } from "./bardo"
import { Snapshot } from "./snapshot"
import { ReloadReason } from "./native/browser_adapter"

type ResolvingFunctions<T = unknown> = {
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: any): void
}

export type Render<E> = (currentElement: E, newElement: E) => void

export abstract class Renderer<E extends Element, S extends Snapshot<E> = Snapshot<E>> implements BardoDelegate {
  readonly currentSnapshot: S
  readonly newSnapshot: S
  readonly isPreview: boolean
  readonly willRender: boolean
  readonly promise: Promise<void>
  renderElement: Render<E>
  private resolvingFunctions?: ResolvingFunctions<void>
  private activeElement: Element | null = null

  constructor(currentSnapshot: S, newSnapshot: S, renderElement: Render<E>, isPreview: boolean, willRender = true) {
    this.currentSnapshot = currentSnapshot
    this.newSnapshot = newSnapshot
    this.isPreview = isPreview
    this.willRender = willRender
    this.renderElement = renderElement
    this.promise = new Promise((resolve, reject) => (this.resolvingFunctions = { resolve, reject }))
  }

  get shouldRender() {
    return true
  }

  get reloadReason(): ReloadReason {
    return
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

  async preservingPermanentElements(callback: () => void) {
    await Bardo.preservingPermanentElements(this, this.permanentElementMap, callback)
  }

  focusFirstAutofocusableElement() {
    const element = this.connectedSnapshot.firstAutofocusableElement
    if (elementIsFocusable(element)) {
      element.focus()
    }
  }

  // Bardo delegate

  enteringBardo(currentPermanentElement: Element) {
    if (this.activeElement) return

    if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
      this.activeElement = this.currentSnapshot.activeElement
    }
  }

  leavingBardo(currentPermanentElement: Element) {
    if (currentPermanentElement.contains(this.activeElement) && this.activeElement instanceof HTMLElement) {
      this.activeElement.focus()

      this.activeElement = null
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
}

function elementIsFocusable(element: any): element is { focus: () => void } {
  return element && typeof element.focus == "function"
}
