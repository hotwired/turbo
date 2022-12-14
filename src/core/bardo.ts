import { PermanentElementMap } from "./snapshot"

export interface BardoDelegate {
  enteringBardo(currentPermanentElement: Element, newPermanentElement: Element): void
  leavingBardo(currentPermanentElement: Element): void
}

export class Bardo {
  readonly permanentElementMap: PermanentElementMap
  readonly delegate: BardoDelegate

  static async preservingPermanentElements(
    delegate: BardoDelegate,
    permanentElementMap: PermanentElementMap,
    callback: () => void
  ) {
    const bardo = new this(delegate, permanentElementMap)
    bardo.enter()
    await callback()
    bardo.leave()
  }

  constructor(delegate: BardoDelegate, permanentElementMap: PermanentElementMap) {
    this.delegate = delegate
    this.permanentElementMap = permanentElementMap
  }

  enter() {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id]
      this.delegate.enteringBardo(currentPermanentElement, newPermanentElement)
      this.replaceNewPermanentElementWithPlaceholder(newPermanentElement)
    }
  }

  leave() {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement] = this.permanentElementMap[id]
      this.replaceCurrentPermanentElementWithClone(currentPermanentElement)
      this.replacePlaceholderWithPermanentElement(currentPermanentElement)
      this.delegate.leavingBardo(currentPermanentElement)
    }
  }

  replaceNewPermanentElementWithPlaceholder(permanentElement: Element) {
    const placeholder = createPlaceholderForPermanentElement(permanentElement)
    permanentElement.replaceWith(placeholder)
  }

  replaceCurrentPermanentElementWithClone(permanentElement: Element) {
    const clone = permanentElement.cloneNode(true)
    permanentElement.replaceWith(clone)
  }

  replacePlaceholderWithPermanentElement(permanentElement: Element) {
    const placeholder = this.getPlaceholderById(permanentElement.id)
    placeholder?.replaceWith(permanentElement)
  }

  getPlaceholderById(id: string) {
    return this.placeholders.find((element) => element.content == id)
  }

  get placeholders(): HTMLMetaElement[] {
    return [...document.querySelectorAll<HTMLMetaElement>("meta[name=turbo-permanent-placeholder][content]")]
  }
}

function createPlaceholderForPermanentElement(permanentElement: Element) {
  const element = document.createElement("meta")
  element.setAttribute("name", "turbo-permanent-placeholder")
  element.setAttribute("content", permanentElement.id)
  return element
}
