import { parseHTMLDocument } from "../../util"
import { Snapshot } from "../snapshot"
import { expandURL } from "../url"
import { HeadSnapshot } from "./head_snapshot"

export class PageSnapshot extends Snapshot<HTMLBodyElement> {
  static fromHTMLString(html = "") {
    return this.fromDocument(parseHTMLDocument(html))
  }

  static fromElement(element: Element) {
    return this.fromDocument(element.ownerDocument)
  }

  static fromDocument({ head, body }: Document) {
    return new this(body as HTMLBodyElement, new HeadSnapshot(head))
  }

  readonly headSnapshot: HeadSnapshot

  constructor(element: HTMLBodyElement, headSnapshot: HeadSnapshot) {
    super(element)
    this.headSnapshot = headSnapshot
  }

  clone() {
    const clonedElement = this.element.cloneNode(true)

    const selectElements = this.element.querySelectorAll("select")
    const clonedSelectElements = clonedElement.querySelectorAll("select")

    for (const [index, source] of selectElements.entries()) {
      for (const [optionIndex, option] of Array.from(source.options).entries()) {
        clonedSelectElements[index].options[optionIndex].selected = option.selected
      }
    }

    for (const clonedPasswordInput of clonedElement.querySelectorAll<HTMLInputElement>('input[type="password"]')) {
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

  // Private

  getSetting(name: string) {
    return this.headSnapshot.getMetaValue(`turbo-${name}`)
  }
}
