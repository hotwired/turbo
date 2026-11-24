import { queryAutofocusableElement } from "../util"

export type PermanentElementMap = Record<string, [Element, Element]>

export class Snapshot<E extends Element = Element> {
  declare readonly element: E

  constructor(element: E) {
    this.element = element
  }

  get activeElement(): Element | null {
    return this.element.ownerDocument.activeElement
  }

  get children(): Element[] {
    return [...this.element.children]
  }

  hasAnchor(anchor: string | undefined): boolean {
    return this.getElementForAnchor(anchor) != null
  }

  getElementForAnchor(anchor: string | undefined): Element | null {
    if (!anchor) return null

    const element = this.#findElementForAnchor(anchor)
    if (element) return element

    // Keep "+" and "&" literal while using the tolerant URLSearchParams decoder.
    const queryValue = anchor.replace(/\+/g, "%2B").replace(/&/g, "%26")
    const decodedAnchor = new URLSearchParams(`anchor=${queryValue}`).get("anchor")
    // CSS.escape turns NUL into U+FFFD, which could select a different target.
    if (decodedAnchor === anchor || decodedAnchor!.includes("\0")) return null

    return this.#findElementForAnchor(decodedAnchor!)
  }

  get isConnected(): boolean {
    return this.element.isConnected
  }

  get firstAutofocusableElement(): HTMLElement | undefined {
    return queryAutofocusableElement(this.element)
  }

  get permanentElements(): NodeListOf<Element> {
    return queryPermanentElementsAll(this.element)
  }

  getPermanentElementById(id: string): Element | null {
    return getPermanentElementById(this.element, id)
  }

  getPermanentElementMapForSnapshot(snapshot: Snapshot): PermanentElementMap {
    const permanentElementMap: PermanentElementMap = {}

    for (const currentPermanentElement of this.permanentElements) {
      const { id } = currentPermanentElement
      const newPermanentElement = snapshot.getPermanentElementById(id)
      if (newPermanentElement) {
        permanentElementMap[id] = [currentPermanentElement, newPermanentElement]
      }
    }

    return permanentElementMap
  }

  #findElementForAnchor(anchor: string): Element | null {
    const id = CSS.escape(anchor)
    return this.element.querySelector(`[id=${id}]`) || this.element.querySelector(`a[name=${id}]`)
  }
}

export function getPermanentElementById(node: ParentNode, id: string): Element | null {
  return node.querySelector(`#${id}[data-turbo-permanent]`)
}

export function queryPermanentElementsAll(node: ParentNode): NodeListOf<Element> {
  return node.querySelectorAll("[id][data-turbo-permanent]")
}
