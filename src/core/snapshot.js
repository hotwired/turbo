import { queryAutofocusableElement } from "../util"

export class Snapshot {
  constructor(element) {
    this.element = element
  }

  get activeElement() {
    return this.element.ownerDocument.activeElement
  }

  get children() {
    return [...this.element.children]
  }

  hasAnchor(anchor) {
    return this.getElementForAnchor(anchor) != null
  }

  getElementForAnchor(anchor) {
    if (!anchor) return null

    const element = this.#findElementForAnchor(anchor)
    if (element) return element

    // Keep "+" and "&" literal while using the tolerant URLSearchParams decoder.
    const queryValue = anchor.replace(/\+/g, "%2B").replace(/&/g, "%26")
    const decodedAnchor = new URLSearchParams(`anchor=${queryValue}`).get("anchor")
    // CSS.escape turns NUL into U+FFFD, which could select a different target.
    if (decodedAnchor === anchor || decodedAnchor.includes("\0")) return null

    return this.#findElementForAnchor(decodedAnchor)
  }

  get isConnected() {
    return this.element.isConnected
  }

  get firstAutofocusableElement() {
    return queryAutofocusableElement(this.element)
  }

  get permanentElements() {
    return queryPermanentElementsAll(this.element)
  }

  getPermanentElementById(id) {
    return getPermanentElementById(this.element, id)
  }

  getPermanentElementMapForSnapshot(snapshot) {
    const permanentElementMap = {}

    for (const currentPermanentElement of this.permanentElements) {
      const { id } = currentPermanentElement
      const newPermanentElement = snapshot.getPermanentElementById(id)
      if (newPermanentElement) {
        permanentElementMap[id] = [currentPermanentElement, newPermanentElement]
      }
    }

    return permanentElementMap
  }

  #findElementForAnchor(anchor) {
    const id = CSS.escape(anchor)
    return this.element.querySelector(`[id=${id}]`) || this.element.querySelector(`a[name=${id}]`)
  }
}

export function getPermanentElementById(node, id) {
  return node.querySelector(`#${id}[data-turbo-permanent]`)
}

export function queryPermanentElementsAll(node) {
  return node.querySelectorAll("[id][data-turbo-permanent]")
}
