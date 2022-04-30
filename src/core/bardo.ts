import { PermanentElementMap } from "./snapshot"

export class Bardo {
  readonly permanentElementMap: PermanentElementMap

  static preservingPermanentElements(permanentElementMap: PermanentElementMap, callback: () => void) {
    const bardo = new this(permanentElementMap)
    bardo.enter()
    callback()
    bardo.leave()
  }

  constructor(permanentElementMap: PermanentElementMap) {
    this.permanentElementMap = permanentElementMap
  }

  enter() {
    for (const id in this.permanentElementMap) {
      const [, newPermanentElement] = this.permanentElementMap[id]
      this.replaceNewPermanentElementWithPlaceholder(newPermanentElement)
    }
  }

  leave() {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement] = this.permanentElementMap[id]
      this.replaceCurrentPermanentElementWithClone(currentPermanentElement)
      this.replacePlaceholderWithPermanentElement(currentPermanentElement)
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
    return [...document.querySelectorAll("meta[name=turbo-permanent-placeholder][content]")] as any
  }
}

function createPlaceholderForPermanentElement(permanentElement: Element) {
  const element = document.createElement("meta")
  element.setAttribute("name", "turbo-permanent-placeholder")
  element.setAttribute("content", permanentElement.id)
  return element
}
