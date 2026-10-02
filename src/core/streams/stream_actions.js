import { session } from "../"
import { morphElements, morphChildren } from "../morphing"
import { expandURL } from "../url"

export const StreamActions = {
  after() {
    this.removeDuplicateTargetSiblings()
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e.nextSibling))
  },

  append() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.append(this.templateContent))
  },

  before() {
    this.removeDuplicateTargetSiblings()
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e))
  },

  prepend() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.prepend(this.templateContent))
  },

  remove() {
    this.targetElements.forEach((e) => e.remove())
  },

  replace() {
    const method = this.getAttribute("method")

    this.targetElements.forEach((targetElement) => {
      if (method === "morph") {
        morphElements(targetElement, this.templateContent)
      } else {
        targetElement.replaceWith(this.templateContent)
      }
    })
  },

  update() {
    const method = this.getAttribute("method")

    this.targetElements.forEach((targetElement) => {
      if (method === "morph") {
        morphChildren(targetElement, this.templateContent)
      } else {
        targetElement.innerHTML = ""
        targetElement.append(this.templateContent)
      }
    })
  },

  refresh() {
    const method = this.getAttribute("method")
    const requestId = this.requestId
    const scroll = this.getAttribute("scroll")

    session.refresh(this.baseURI, { method, requestId, scroll })
  },

  redirect() {
    const url = this.getAttribute("url")
    if (url === null) {
      throw new Error(`${this.description}: url attribute is missing`)
    }

    // Navigating to a non-http(s) URL such as "javascript:" would execute it,
    // turning a user-controlled redirect target into XSS.
    const location = expandURL(url)
    if (location.protocol !== "http:" && location.protocol !== "https:") {
      throw new Error(`${this.description}: url must use the http or https scheme, "${location.protocol}" given`)
    }

    // Turbo Drive can only visit same-origin locations
    if (location.origin !== window.location.origin) {
      window.location.assign(location.href)
      return
    }

    session.visit(location, { action: this.hasAttribute("advance") ? "advance" : "replace" })
  }
}
