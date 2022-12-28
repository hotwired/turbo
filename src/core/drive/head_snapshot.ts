import { Snapshot } from "../snapshot"

export class HeadSnapshot extends Snapshot<HTMLHeadElement> {
  elements: { [key: string]: Array<Element> } = {}
  stylesheetElements: Array<Element> = []
  trackedElements: Array<Element> = []

  constructor(element: HTMLHeadElement) {
    super(element)
    this.parseDetailsByOuterHTML()
  }

  parseDetailsByOuterHTML() {
    for (let element of this.children) {
      element = elementWithoutNonce(element)
      if (elementIsStylesheet(element)) this.stylesheetElements.push(element)
      else {
        const collection = this.elements[element.localName] || []
        collection.push(element)
        this.elements[element.localName] = collection
      }

      if (element.getAttribute("data-turbo-track") == "reload") this.trackedElements.push(element)
    }
  }

  get trackedElementSignature(): string {
    return this.trackedElements.map((e) => e.outerHTML).join("")
  }

  get stylesheets(): Array<Element> {
    return this.stylesheetElements
  }

  getElements(localName: string): Array<Element> {
    return this.elements[localName] || []
  }

  getMetaValue(name: string): string | null {
    const element = this.findMetaElementByName(name)
    return element ? element.getAttribute("content") : null
  }

  findMetaElementByName(name: string) {
    return this.getElements("meta").find((e) => (e as HTMLMetaElement).name == name) as Element | undefined
  }
}

function elementIsStylesheet(element: Element) {
  const tagName = element.localName
  return tagName == "style" || (tagName == "link" && element.getAttribute("rel") == "stylesheet")
}

function elementWithoutNonce(element: Element) {
  if (element.hasAttribute("nonce")) {
    element.setAttribute("nonce", "")
  }

  return element
}
