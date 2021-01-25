import { Snapshot, SnapshotRootNode } from "../snapshot"
import { expandURL } from "../url"
import { HeadSnapshot } from "./head_snapshot"

export class PageSnapshot extends Snapshot {
  static fromHTMLString(html = "") {
    const document = new DOMParser().parseFromString(html, "text/html")
    return this.fromDocument(document)
  }

  static fromHTMLElement(element: HTMLElement) {
    return this.fromDocument(element.ownerDocument)
  }

  static fromDocument({ head, body }: Document) {
    return new this(body, new HeadSnapshot(head))
  }

  readonly headSnapshot: HeadSnapshot

  constructor(rootNode: SnapshotRootNode, headSnapshot: HeadSnapshot) {
    super(rootNode)
    this.headSnapshot = headSnapshot
  }

  clone() {
    return new PageSnapshot(this.rootNode.cloneNode(true), this.headSnapshot)
  }

  get headElement() {
    return this.headSnapshot.rootNode as HTMLHeadElement
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
