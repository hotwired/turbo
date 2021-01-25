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
    return new PageSnapshot(this.element.cloneNode(true), this.headSnapshot)
  }

  get headElement() {
    return this.headSnapshot.element
  }

  get rootLocation(): URL {
    const root = this.getSetting("root", "/")
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

  getSetting(name: string): string | undefined
  getSetting(name: string, defaultValue: string): string
  getSetting(name: string, defaultValue?: string) {
    const value = this.headSnapshot.getMetaValue(`turbo-${name}`)
    return value == null ? defaultValue : value
  }
}
