import { Snapshot } from "../snapshot"

export class HeadSnapshot extends Snapshot {
  detailsByOuterHTML = this.children
    .filter((element) => !elementIsNoscript(element))
    .map((element) => elementWithoutNonce(element))
    .reduce((result, element) => {
      const { outerHTML } = element
      const details =
        outerHTML in result
          ? result[outerHTML]
          : {
              type: elementType(element),
              tracked: elementIsTracked(element),
              elements: []
            }
      return {
        ...result,
        [outerHTML]: {
          ...details,
          elements: [...details.elements, element]
        }
      }
    }, {})

  get trackedElementSignature() {
    return Object.keys(this.detailsByOuterHTML)
      .filter((outerHTML) => this.detailsByOuterHTML[outerHTML].tracked)
      .join("")
  }

  getScriptElementsNotInSnapshot(snapshot) {
    return this.getElementsMatchingTypeNotInSnapshot("script", snapshot)
  }

  getStylesheetElementsNotInSnapshot(snapshot) {
    return this.getElementsMatchingTypeNotInSnapshot("stylesheet", snapshot)
  }

  getElementsMatchingTypeNotInSnapshot(matchedType, snapshot) {
    return Object.keys(this.detailsByOuterHTML)
      .filter((outerHTML) => !(outerHTML in snapshot.detailsByOuterHTML))
      .map((outerHTML) => this.detailsByOuterHTML[outerHTML])
      .filter(({ type }) => type == matchedType)
      .map(({ elements: [element] }) => element)
  }

  get provisionalElements() {
    return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
      const { type, tracked, elements } = this.detailsByOuterHTML[outerHTML]
      if (type == null && !tracked) {
        return [...result, ...elements]
      } else if (elements.length > 1) {
        return [...result, ...elements.slice(1)]
      } else {
        return result
      }
    }, [])
  }

  getMetaValue(name) {
    const element = this.findMetaElementByName(name)
    return element ? element.getAttribute("content") : null
  }

  findMetaElementByName(name) {
    return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
      const {
        elements: [element]
      } = this.detailsByOuterHTML[outerHTML]
      return elementIsMetaElementWithName(element, name) ? element : result
    }, undefined | undefined)
  }
}

function elementType(element) {
  if (elementIsScript(element)) {
    return "script"
  } else if (elementIsStylesheet(element)) {
    return "stylesheet"
  }
}

function elementIsTracked(element) {
  return element.getAttribute("data-turbo-track") == "reload"
}

function elementIsScript(element) {
  const tagName = element.localName
  return tagName == "script"
}

function elementIsNoscript(element) {
  const tagName = element.localName
  return tagName == "noscript"
}

function elementIsStylesheet(element) {
  const tagName = element.localName
  return tagName == "style" || (tagName == "link" && element.getAttribute("rel") == "stylesheet")
}

function elementIsMetaElementWithName(element, name) {
  const tagName = element.localName
  return tagName == "meta" && element.getAttribute("name") == name
}

function elementWithoutNonce(element) {
  if (element.hasAttribute("nonce")) {
    element.setAttribute("nonce", "")
  }

  return element
}
