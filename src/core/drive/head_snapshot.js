import { Snapshot } from "../snapshot"

export class HeadSnapshot extends Snapshot {
  elements = {}  // type: element
  stylesheetElements = []
  trackedElements = []

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

  get trackedElementSignature() {
    return this.trackedElements.map((e) => e.outerHTML).join("")
  }

  get stylesheets(){
    return this.stylesheetElements
  }

  getElements(localName: string) {
    return this.elements[localName] || []
  }

  getMetaValue(name) {
    const element = this.findMetaElementByName(name)
    return element ? element.getAttribute("content") : null
  }

  findMetaElementByName(name) {
    return this.getElements("meta").find((e) => e.name == name)
  }
}

function elementIsStylesheet(element: Element) {
  const tagName = element.localName
  return tagName == "style" || (tagName == "link" && element.getAttribute("rel") == "stylesheet")
}

function elementWithoutNonce(element) {
  if (element.hasAttribute("nonce")) {
    element.setAttribute("nonce", "")
  }

  return element
}
