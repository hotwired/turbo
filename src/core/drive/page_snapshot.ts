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

  static fromDocument({ head, body, documentElement }: Document) {
    return new this(body as HTMLBodyElement, new HeadSnapshot(head), documentElement as HTMLHtmlElement)
  }

  readonly headSnapshot: HeadSnapshot
  readonly htmlElement: HTMLHtmlElement

  constructor(element: HTMLBodyElement, headSnapshot: HeadSnapshot, htmlElement: HTMLHtmlElement) {
    super(element)
    this.headSnapshot = headSnapshot
    this.htmlElement = htmlElement
  }

  clone() {
    const clonedElement = this.element.cloneNode(true);

    const selects = this.element.querySelectorAll<HTMLSelectElement>('select')
    const clonedSelects = clonedElement.querySelectorAll<HTMLSelectElement>('select')
    for (let i = 0; i < selects.length; i++) {
      clonedSelects[i].value = selects[i].value
    }

    return new PageSnapshot(clonedElement, this.headSnapshot, this.htmlElement)
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
