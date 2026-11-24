import { activateScriptElement, elementIsStylesheet, waitForLoad } from "../../util"
import { Renderer } from "../renderer"
import type { PageSnapshot } from "./page_snapshot"
import type { HeadSnapshot } from "./head_snapshot"
import type { ReloadReason, StructuredReason } from "../types"

export class PageRenderer extends Renderer<HTMLBodyElement, PageSnapshot> {
  #reloadLocation: URL | undefined

  static renderElement(_currentElement: Element, newElement: Element): void {
    if (document.body && newElement instanceof HTMLBodyElement) {
      document.body.replaceWith(newElement)
    } else {
      document.documentElement.appendChild(newElement)
    }
  }

  constructor(
    currentSnapshot: PageSnapshot,
    newSnapshot: PageSnapshot,
    isPreview: boolean,
    willRender = true,
    reloadLocation?: URL
  ) {
    super(currentSnapshot, newSnapshot, isPreview, willRender)
    this.#reloadLocation = reloadLocation
  }

  get shouldRender(): boolean {
    return this.newSnapshot.isVisitable && this.#hasCompatibleTrackedElements
  }

  get reloadReason(): ReloadReason {
    if (!this.newSnapshot.isVisitable) {
      return this.#getReloadReason("turbo_visit_control_is_reload")
    }

    if (!this.#hasCompatibleTrackedElements) {
      return this.#getReloadReason("tracked_element_mismatch")
    }
  }

  async prepareToRender(): Promise<void> {
    this.#setLanguage()
    await this.mergeHead()
  }

  async render(): Promise<void> {
    if (this.willRender) {
      await this.replaceBody()
    }
  }

  finishRendering(): void {
    super.finishRendering()
    if (!this.isPreview) {
      this.focusFirstAutofocusableElement()
    }
  }

  get currentHeadSnapshot(): HeadSnapshot {
    return this.currentSnapshot.headSnapshot
  }

  get newHeadSnapshot(): HeadSnapshot {
    return this.newSnapshot.headSnapshot
  }

  get newElement(): HTMLBodyElement {
    return this.newSnapshot.element
  }

  async mergeHead(): Promise<void> {
    const mergedHeadElements = this.mergeProvisionalElements()
    const newStylesheetElements = this.copyNewHeadStylesheetElements()
    this.copyNewHeadScriptElements()

    await mergedHeadElements
    await newStylesheetElements

    if (this.willRender) {
      this.removeUnusedDynamicStylesheetElements()
    }
  }

  async replaceBody(): Promise<void> {
    await this.preservingPermanentElements(async () => {
      this.activateNewBody()
      await this.assignNewBody()
    })
  }

  get trackedElementsAreIdentical(): boolean {
    return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature
  }

  async copyNewHeadStylesheetElements(): Promise<void> {
    const loadingElements: Promise<void>[] = []

    for (const element of this.newHeadStylesheetElements) {
      loadingElements.push(waitForLoad(element))

      document.head.appendChild(element)
    }

    await Promise.all(loadingElements)
  }

  copyNewHeadScriptElements(): void {
    for (const element of this.newHeadScriptElements) {
      document.head.appendChild(activateScriptElement(element))
    }
  }

  removeUnusedDynamicStylesheetElements(): void {
    for (const element of this.unusedDynamicStylesheetElements) {
      document.head.removeChild(element)
    }
  }

  async mergeProvisionalElements(): Promise<void> {
    if (this.willRender) {
      const newHeadElements = [...this.newHeadProvisionalElements]

      for (const element of this.currentHeadProvisionalElements) {
        if (!this.isCurrentElementInElementList(element, newHeadElements)) {
          document.head.removeChild(element)
        }
      }

      for (const element of newHeadElements) {
        document.head.appendChild(element)
      }
    } else {
      this.#mergePartialProvisionalElements()
    }
  }

  isCurrentElementInElementList(element: Element, elementList: Element[]): boolean {
    for (const [index, newElement] of elementList.entries()) {
      // if title element...
      if (element.tagName == "TITLE") {
        if (newElement.tagName != "TITLE") {
          continue
        }
        if (element.innerHTML == newElement.innerHTML) {
          elementList.splice(index, 1)
          return true
        }
      }

      // if any other element...
      if (newElement.isEqualNode(element)) {
        elementList.splice(index, 1)
        return true
      }
    }

    return false
  }

  removeCurrentHeadProvisionalElements(): void {
    for (const element of this.currentHeadProvisionalElements) {
      document.head.removeChild(element)
    }
  }

  copyNewHeadProvisionalElements(): void {
    for (const element of this.newHeadProvisionalElements) {
      document.head.appendChild(element)
    }
  }

  activateNewBody(): void {
    document.adoptNode(this.newElement)
    this.deactivateNoscriptStylesheetElements()
    this.activateNewBodyScriptElements()
  }

  deactivateNoscriptStylesheetElements(): void {
    for (const noscriptElement of this.newElement.querySelectorAll("noscript")) {
      for (const child of [...noscriptElement.children]) {
        if (elementIsStylesheet(child)) {
          child.remove()
        }
      }
    }
  }

  activateNewBodyScriptElements(): void {
    for (const inertScriptElement of this.newBodyScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  async assignNewBody(): Promise<void> {
    await this.renderElement(this.currentElement, this.newElement)
  }

  get unusedDynamicStylesheetElements(): HTMLElement[] {
    return this.oldHeadStylesheetElements.filter((element) => {
      return element.getAttribute("data-turbo-track") === "dynamic"
    })
  }

  get oldHeadStylesheetElements(): HTMLElement[] {
    return this.currentHeadSnapshot.getStylesheetElementsNotInSnapshot(this.newHeadSnapshot)
  }

  get newHeadStylesheetElements(): HTMLElement[] {
    return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  get newHeadScriptElements(): HTMLScriptElement[] {
    return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  get currentHeadProvisionalElements(): Element[] {
    return this.currentHeadSnapshot.provisionalElements
  }

  get newHeadProvisionalElements(): Element[] {
    return this.newHeadSnapshot.provisionalElements
  }

  get newBodyScriptElements(): NodeListOf<HTMLScriptElement> {
    return this.newElement.querySelectorAll("script")
  }

  // Private

  get #hasCompatibleTrackedElements(): boolean {
    if (this.willRender) {
      return this.trackedElementsAreIdentical
    } else {
      const currentElements = this.currentHeadSnapshot.detailsByOuterHTML
      return Object.entries(this.newHeadSnapshot.detailsByOuterHTML).every(([outerHTML, { tracked }]) => {
        return !tracked || outerHTML in currentElements
      })
    }
  }

  #getReloadReason(reason: string): StructuredReason {
    const reloadReason: StructuredReason = { reason }
    if (this.#reloadLocation) {
      reloadReason.context = { location: this.#reloadLocation }
    }
    return reloadReason
  }

  #setLanguage(): void {
    const { documentElement } = this.currentSnapshot
    const { dir, lang } = this.newSnapshot

    if (lang || (!this.willRender && lang !== null)) {
      documentElement.setAttribute("lang", lang!)
    } else if (this.willRender) {
      documentElement.removeAttribute("lang")
    }
    if (dir || (!this.willRender && dir !== null)) {
      documentElement.setAttribute("dir", dir!)
    } else if (this.willRender) {
      documentElement.removeAttribute("dir")
    }
  }

  #mergePartialProvisionalElements(): void {
    const currentElements = this.#getProvisionalElementsInDocumentOrder(this.currentHeadSnapshot)
    const suppliedElements = this.#getProvisionalElementsInDocumentOrder(this.newHeadSnapshot)
    const unusedElements = [...currentElements]
    const mergedElements = suppliedElements.map((element) => {
      const index = unusedElements.findIndex((currentElement) => currentElement.isEqualNode(element))
      return index < 0 ? element : unusedElements.splice(index, 1)[0]
    })

    for (const element of unusedElements) {
      if (suppliedElements.some((suppliedElement) => this.#hasSameProvisionalElementIdentity(element, suppliedElement))) {
        document.head.removeChild(element)
      }
    }

    const currentSuppliedElements = currentElements.filter((element) => mergedElements.includes(element))
    const hasCorrectOrder = currentSuppliedElements.length === mergedElements.length &&
      currentSuppliedElements.every((element, index) => element === mergedElements[index])

    if (!hasCorrectOrder) {
      for (const element of mergedElements) {
        document.head.appendChild(element)
      }
    }
  }

  #getProvisionalElementsInDocumentOrder(headSnapshot: HeadSnapshot): Element[] {
    const elements = headSnapshot.provisionalElements
    return headSnapshot.children.filter((element) => elements.includes(element))
  }

  #hasSameProvisionalElementIdentity(element: Element, otherElement: Element): boolean {
    if (element.tagName === otherElement.tagName) {
      switch (element.tagName) {
        case "TITLE":
        case "BASE":
          return true
        case "META": {
          const attribute = ["name", "property", "http-equiv", "itemprop"].find((name) => {
            return element.hasAttribute(name) && otherElement.hasAttribute(name)
          })
          let hasSameName
          if (attribute === "http-equiv") {
            hasSameName =
              (element as HTMLMetaElement).httpEquiv.toLowerCase() === (otherElement as HTMLMetaElement).httpEquiv.toLowerCase()
          } else if (attribute) {
            hasSameName = element.getAttribute(attribute) === otherElement.getAttribute(attribute)
          } else {
            hasSameName = element.hasAttribute("charset") && otherElement.hasAttribute("charset")
          }
          return hasSameName && (element.getAttribute("media") || "") === (otherElement.getAttribute("media") || "")
        }
        case "LINK": {
          const relations = [...(element as HTMLLinkElement).relList].map((relation) => relation.toLowerCase())
          const otherRelations = [...(otherElement as HTMLLinkElement).relList].map((relation) => relation.toLowerCase())

          if (["canonical", "manifest"].some((relation) => relations.includes(relation) && otherRelations.includes(relation))) {
            return true
          } else if (relations.includes("icon") && otherRelations.includes("icon")) {
            return ["type", "sizes", "media"].every((name) => {
              return (element.getAttribute(name) || "") === (otherElement.getAttribute(name) || "")
            })
          }
        }
      }
    }
    return false
  }
}
