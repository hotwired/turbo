import { Bardo, type BardoDelegate } from "./bardo"
import type { Snapshot } from "./snapshot"
import type { ReloadReason } from "./types"

export type ResolvingFunctions<T = unknown> = {
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: unknown): void
}

export type Render<E extends Element = Element> = (currentElement: E, newElement: E) => void

export type RenderMethod = "replace" | "morph"

export class Renderer<E extends Element = Element, S extends Snapshot<E> = Snapshot<E>> implements BardoDelegate {
  #activeElement: Element | null = null

  declare readonly currentSnapshot: S
  declare readonly newSnapshot: S
  declare readonly isPreview: boolean
  declare readonly willRender: boolean
  declare renderElement: Render<E>
  declare readonly promise: Promise<void>
  declare resolvingFunctions?: ResolvingFunctions<void>

  static renderElement(_currentElement: Element, _newElement: Element): void {
    // Abstract method
  }

  constructor(currentSnapshot: S, newSnapshot: S, isPreview: boolean, willRender = true) {
    this.currentSnapshot = currentSnapshot
    this.newSnapshot = newSnapshot
    this.isPreview = isPreview
    this.willRender = willRender
    this.renderElement = (this.constructor as typeof Renderer).renderElement as Render<E>
    this.promise = new Promise((resolve, reject) => (this.resolvingFunctions = { resolve, reject }))
  }

  get shouldRender(): boolean {
    return true
  }

  get shouldAutofocus(): boolean {
    return true
  }

  get reloadReason(): ReloadReason | undefined {
    return
  }

  prepareToRender(): void | Promise<void> {
    return
  }

  render(): void | Promise<void> {
    // Abstract method
  }

  finishRendering(): void {
    if (this.resolvingFunctions) {
      this.resolvingFunctions.resolve()
      delete this.resolvingFunctions
    }
  }

  async preservingPermanentElements(callback: () => void | Promise<void>): Promise<void> {
    await Bardo.preservingPermanentElements(this, this.permanentElementMap, callback)
  }

  focusFirstAutofocusableElement(): void {
    if (this.shouldAutofocus) {
      const element = this.connectedSnapshot.firstAutofocusableElement
      if (element) {
        element.focus()
      }
    }
  }

  // Bardo delegate

  enteringBardo(currentPermanentElement: Element): void {
    if (this.#activeElement) return

    if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
      this.#activeElement = this.currentSnapshot.activeElement
    }
  }

  leavingBardo(currentPermanentElement: Element): void {
    if (currentPermanentElement.contains(this.#activeElement) && this.#activeElement instanceof HTMLElement) {
      this.#activeElement.focus()

      this.#activeElement = null
    }
  }

  get connectedSnapshot(): S {
    return this.newSnapshot.isConnected ? this.newSnapshot : this.currentSnapshot
  }

  get currentElement(): E {
    return this.currentSnapshot.element
  }

  get newElement(): E {
    return this.newSnapshot.element
  }

  get permanentElementMap(): ReturnType<Snapshot["getPermanentElementMapForSnapshot"]> {
    return this.currentSnapshot.getPermanentElementMapForSnapshot(this.newSnapshot)
  }

  get renderMethod(): RenderMethod {
    return "replace"
  }
}
