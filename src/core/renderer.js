import { FrameElement } from "../elements/frame_element"
import { Bardo } from "./bardo"

export class Renderer {
  #activeElement = null

  static renderElement(currentElement, newElement) {
    // Abstract method
  }

  static shouldRefreshChildFrameWithMorphing(parentFrame, frame) {
    return frame instanceof FrameElement &&
      frame.shouldReloadWithMorph &&
      !frame.closest("[data-turbo-permanent]") &&
      frame.parentElement.closest("turbo-frame[src][refresh=morph]") === parentFrame
  }

  constructor(currentSnapshot, newSnapshot, isPreview, willRender = true) {
    this.currentSnapshot = currentSnapshot
    this.newSnapshot = newSnapshot
    this.isPreview = isPreview
    this.willRender = willRender
    this.renderElement = this.constructor.renderElement
    this.promise = new Promise((resolve, reject) => (this.resolvingFunctions = { resolve, reject }))
  }

  get shouldRender() {
    return true
  }

  get shouldAutofocus() {
    return true
  }

  get reloadReason() {
    return
  }

  prepareToRender() {
    return
  }

  render() {
    // Abstract method
  }

  finishRendering() {
    if (this.resolvingFunctions) {
      this.resolvingFunctions.resolve()
      delete this.resolvingFunctions
    }
  }

  async preservingPermanentElements(callback) {
    await Bardo.preservingPermanentElements(this, this.permanentElementMap, callback)
  }

  focusFirstAutofocusableElement() {
    if (this.shouldAutofocus) {
      const element = this.connectedSnapshot.firstAutofocusableElement
      if (element) {
        element.focus()
      }
    }
  }

  // Bardo delegate

  enteringBardo(currentPermanentElement) {
    if (this.#activeElement) return

    if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
      this.#activeElement = this.currentSnapshot.activeElement
    }
  }

  leavingBardo(currentPermanentElement) {
    if (currentPermanentElement.contains(this.#activeElement) && this.#activeElement instanceof HTMLElement) {
      this.#activeElement.focus()

      this.#activeElement = null
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

  get renderMethod() {
    return "replace"
  }
}
