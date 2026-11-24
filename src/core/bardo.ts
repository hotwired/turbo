import type { PermanentElementMap } from "./snapshot"

export interface BardoDelegate {
  enteringBardo(currentPermanentElement: Element, newPermanentElement: Element): void
  leavingBardo(currentPermanentElement: Element): void
}

export class Bardo {
  declare readonly delegate: BardoDelegate
  declare readonly permanentElementMap: PermanentElementMap

  static async preservingPermanentElements(
    delegate: BardoDelegate,
    permanentElementMap: PermanentElementMap,
    callback: () => void | Promise<void>
  ): Promise<void> {
    const bardo = new this(delegate, permanentElementMap)
    bardo.enter()
    await callback()
    bardo.leave()
  }

  constructor(delegate: BardoDelegate, permanentElementMap: PermanentElementMap) {
    this.delegate = delegate
    this.permanentElementMap = permanentElementMap
  }

  enter(): void {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id]
      this.delegate.enteringBardo(currentPermanentElement, newPermanentElement)
      this.replaceNewPermanentElementWithPlaceholder(newPermanentElement)
    }
  }

  leave(): void {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement] = this.permanentElementMap[id]
      this.replaceCurrentPermanentElementWithClone(currentPermanentElement)
      this.replacePlaceholderWithPermanentElement(currentPermanentElement)
      this.delegate.leavingBardo(currentPermanentElement)
    }
  }

  replaceNewPermanentElementWithPlaceholder(permanentElement: Element): void {
    const placeholder = createPlaceholderForPermanentElement(permanentElement)
    permanentElement.replaceWith(placeholder)
  }

  replaceCurrentPermanentElementWithClone(permanentElement: Element): void {
    const clone = permanentElement.cloneNode(true)
    permanentElement.replaceWith(clone)
  }

  replacePlaceholderWithPermanentElement(permanentElement: Element): void {
    const placeholder = this.getPlaceholderById(permanentElement.id)
    placeholder?.replaceWith(permanentElement)
  }

  getPlaceholderById(id: string): HTMLMetaElement | undefined {
    return this.placeholders.find((element) => element.content == id)
  }

  get placeholders(): HTMLMetaElement[] {
    return [...document.querySelectorAll<HTMLMetaElement>("meta[name=turbo-permanent-placeholder][content]")]
  }
}

function createPlaceholderForPermanentElement(permanentElement: Element): HTMLMetaElement {
  const element = document.createElement("meta")
  element.setAttribute("name", "turbo-permanent-placeholder")
  element.setAttribute("content", permanentElement.id)
  return element
}
