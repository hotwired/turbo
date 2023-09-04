import { parseHTMLDocument } from "../../util"
import { Snapshot } from "../snapshot"
import { expandURL } from "../url"
import { HeadSnapshot } from "./head_snapshot"

export class PageSnapshot extends Snapshot {
  static fromHTMLString(html = "") {
    return this.fromDocument(parseHTMLDocument(html))
  }

  static fromElement(element) {
    return this.fromDocument(element.ownerDocument)
  }

  static fromDocument({ head, body }) {
    return new this(body, new HeadSnapshot(head))
  }

  constructor(element, headSnapshot) {
    super(element)
    this.headSnapshot = headSnapshot
  }

  clone() {
    const clonedElement = this.element.cloneNode(true)

    const selectElements = this.element.querySelectorAll("select")
    const clonedSelectElements = clonedElement.querySelectorAll("select")

    for (const [index, source] of selectElements.entries()) {
      const clone = clonedSelectElements[index]
      for (const option of clone.selectedOptions) option.selected = false
      for (const option of source.selectedOptions) clone.options[option.index].selected = true
    }

    for (const clonedPasswordInput of clonedElement.querySelectorAll('input[type="password"]')) {
      clonedPasswordInput.value = ""
    }

    return new PageSnapshot(clonedElement, this.headSnapshot)
  }

  get headElement() {
    return this.headSnapshot.element
  }

  get rootLocation() {
    const root = this.getSetting("root") ?? "/"
    return expandURL(root)
  }

  get cacheControlValue() {
    return this.getSetting("cache-control")
  }

  get isPreviewable() {
    return this.cacheControlValue != "no-preview"
  }

  get isCacheable() {
    return this.cacheControlValue != "no-cache"
  }

  get isVisitable() {
    return this.getSetting("visit-control") != "reload"
  }

  get prefersViewTransitions() {
    return this.headSnapshot.getMetaValue("view-transition") === "same-origin"
  }

  // Private

  getSetting(name) {
    return this.headSnapshot.getMetaValue(`turbo-${name}`)
  }
}
