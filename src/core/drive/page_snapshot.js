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

  static fromDocument({ documentElement, body, head }) {
    return new this(documentElement, body, new HeadSnapshot(head))
  }

  constructor(documentElement, body, headSnapshot) {
    super(body)
    this.documentElement = documentElement
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

    return new PageSnapshot(this.documentElement, clonedElement, this.headSnapshot)
  }

  get lang() {
    return this.documentElement.getAttribute("lang")
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

  get shouldMorphPage() {
    return this.getSetting("refresh-method") === "morph"
  }

  get shouldPreserveScrollPosition() {
    return this.getSetting("refresh-scroll") === "preserve"
  }

  // Private

  getSetting(name) {
    return this.headSnapshot.getMetaValue(`turbo-${name}`)
  }
}
