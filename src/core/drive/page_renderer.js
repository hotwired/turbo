import { activateScriptElement, elementIsStylesheet, waitForLoad } from "../../util"
import { Renderer } from "../renderer"

export class PageRenderer extends Renderer {
  static renderElement(currentElement, newElement) {
    if (document.body && newElement instanceof HTMLBodyElement) {
      document.body.replaceWith(newElement)
    } else {
      document.documentElement.appendChild(newElement)
    }
  }

  get shouldRender() {
    return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical
  }

  get reloadReason() {
    if (!this.newSnapshot.isVisitable) {
      return {
        reason: "turbo_visit_control_is_reload"
      }
    }

    if (!this.trackedElementsAreIdentical) {
      return {
        reason: "tracked_element_mismatch"
      }
    }
  }

  async prepareToRender() {
    this.#setLanguage()
    await this.mergeHead()
  }

  async render() {
    if (this.willRender) {
      await this.replaceBody()
    }
  }

  finishRendering() {
    super.finishRendering()
    if (!this.isPreview) {
      this.focusFirstAutofocusableElement()
    }
  }

  get currentHeadSnapshot() {
    return this.currentSnapshot.headSnapshot
  }

  get newHeadSnapshot() {
    return this.newSnapshot.headSnapshot
  }

  get newElement() {
    return this.newSnapshot.element
  }

  #setLanguage() {
    const { documentElement } = this.currentSnapshot
    const { dir, lang } = this.newSnapshot

    if (lang) {
      documentElement.setAttribute("lang", lang)
    } else {
      documentElement.removeAttribute("lang")
    }
    if (dir) {
      documentElement.setAttribute("dir", dir)
    } else {
      documentElement.removeAttribute("dir")
    }
  }

  async mergeHead() {
    const mergedHeadElements = this.mergeProvisionalElements()
    const newStylesheetElements = this.copyNewHeadStylesheetElements()
    this.copyNewHeadScriptElements()

    await mergedHeadElements
    await newStylesheetElements

    // if (this.willRender) {
    //   this.removeUnusedDynamicStylesheetElements()
    // }
  }

  async replaceBody() {
    await this.preservingPermanentElements(async () => {
      this.activateNewBody()
      await this.assignNewBody()
    })
  }

  get trackedElementsAreIdentical() {
    return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature
  }

  // async copyNewHeadStylesheetElements() {
  //   const loadingElements = []
  //
  //   for (const element of this.newHeadStylesheetElements) {
  //     loadingElements.push(waitForLoad(element))
  //
  //     document.head.appendChild(element)
  //   }
  //
  //   await Promise.all(loadingElements)
  // }

  removeFingerprint(url) {
    if (!url) { return url }
    return url.replace(/-[0-9a-f]{7,128}(\.digested)?\.css$/, ".css")
  }

  stylesheetElementIsDynamic(element) {
    return element.getAttribute("data-turbo-track") == "dynamic" &&
      element.getAttribute("href") != null
  }

  async copyNewHeadStylesheetElements() {
    const loadingElements = []
    const preloadElements = []

    const newStylesheetElements = this.newHeadStylesheetElements.filter(this.stylesheetElementIsDynamic)
    const oldStylesheetElements = this.currentHeadSnapshot.getStylesheetElementsNotInSnapshot(this.newHeadSnapshot).filter(this.stylesheetElementIsDynamic)

    const oldElementIndex = Object.fromEntries(oldStylesheetElements.map(element => [this.removeFingerprint(element.getAttribute("href")), element]))

    let lastStylesheetElement = null

    for (const newElement of newStylesheetElements) {
      const newHref = newElement.getAttribute("href")
      const hrefWithoutFingerprint = this.removeFingerprint(newHref)
      const oldElement = oldElementIndex[hrefWithoutFingerprint]
      const oldHref = oldElement && oldElement.getAttribute("href")

      if (oldHref == newHref) {
        console.log(`Skipping ${newHref}`)
        delete oldElementIndex[hrefWithoutFingerprint]
        continue
      }

      // Convert the link tag to a preload so that it can be enabled at the same
      // time as others (after everything has loaded) and any old stylesheets can
      // be removed at the same time as well.
      newElement.setAttribute("as", "style")
      newElement.setAttribute("rel", "preload")
      preloadElements.push(newElement)

      loadingElements.push(waitForLoad(newElement))

      if (oldElement) {
        console.log(`Updating ${oldElement.getAttribute("href")} to ${newHref}`)

        oldElement.after(newElement)
      } else {
        console.log(`Appending ${newHref} after`, lastStylesheetElement)

        // Ensure that the new elements maintain their order as much as possible
        if (lastStylesheetElement) {
          lastStylesheetElement.after(newElement)
        } else {
          document.head.appendChild(newElement)
        }
      }

      lastStylesheetElement = newElement
    }

    await Promise.all(loadingElements)

    for (const element of Object.values(oldElementIndex)) {
      console.log(`Removing ${element.getAttribute("href")}`)

      element.remove()
    }

    for (const element of preloadElements) {
      console.log(`Converting preload ${element.getAttribute("href")}`)

      element.setAttribute("rel", "stylesheet")
      element.removeAttribute("as")
    }
  }

  copyNewHeadScriptElements() {
    for (const element of this.newHeadScriptElements) {
      document.head.appendChild(activateScriptElement(element))
    }
  }

  // removeUnusedDynamicStylesheetElements() {
  //   for (const element of this.unusedDynamicStylesheetElements) {
  //     document.head.removeChild(element)
  //   }
  // }

  async mergeProvisionalElements() {
    const newHeadElements = [...this.newHeadProvisionalElements]

    for (const element of this.currentHeadProvisionalElements) {
      if (!this.isCurrentElementInElementList(element, newHeadElements)) {
        document.head.removeChild(element)
      }
    }

    for (const element of newHeadElements) {
      document.head.appendChild(element)
    }
  }

  isCurrentElementInElementList(element, elementList) {
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

  removeCurrentHeadProvisionalElements() {
    for (const element of this.currentHeadProvisionalElements) {
      document.head.removeChild(element)
    }
  }

  copyNewHeadProvisionalElements() {
    for (const element of this.newHeadProvisionalElements) {
      document.head.appendChild(element)
    }
  }

  activateNewBody() {
    document.adoptNode(this.newElement)
    this.deactivateNoscriptStylesheetElements()
    this.activateNewBodyScriptElements()
  }

  deactivateNoscriptStylesheetElements() {
    for (const noscriptElement of this.newElement.querySelectorAll("noscript")) {
      for (const child of [...noscriptElement.children]) {
        if (elementIsStylesheet(child)) {
          child.remove()
        }
      }
    }
  }

  activateNewBodyScriptElements() {
    for (const inertScriptElement of this.newBodyScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  async assignNewBody() {
    await this.renderElement(this.currentElement, this.newElement)
  }

  get unusedDynamicStylesheetElements() {
    return this.oldHeadStylesheetElements.filter((element) => {
      return element.getAttribute("data-turbo-track") === "dynamic"
    })
  }

  get oldHeadStylesheetElements() {
    return this.currentHeadSnapshot.getStylesheetElementsNotInSnapshot(this.newHeadSnapshot)
  }

  get newHeadStylesheetElements() {
    return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  get newHeadScriptElements() {
    return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  get currentHeadProvisionalElements() {
    return this.currentHeadSnapshot.provisionalElements
  }

  get newHeadProvisionalElements() {
    return this.newHeadSnapshot.provisionalElements
  }

  get newBodyScriptElements() {
    return this.newElement.querySelectorAll("script")
  }
}
