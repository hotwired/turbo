import { HeadDetails } from "./head_details"
import { expandURL } from "../url"

export class Snapshot {
  static wrap(value: Snapshot | string | HTMLHtmlElement) {
    if (value instanceof this) {
      return value
    } else if (typeof value == "string") {
      return this.fromHTMLString(value)
    } else {
      return this.fromHTMLElement(value)
    }
  }

  static fromHTMLString(html: string) {
    const { documentElement } = new DOMParser().parseFromString(html, "text/html")
    return this.fromHTMLElement(documentElement as HTMLHtmlElement)
  }

  static fromHTMLElement(htmlElement: HTMLHtmlElement) {
    const headElement = htmlElement.querySelector("head")
    const bodyElement = htmlElement.querySelector("body") || document.createElement("body")
    const headDetails = HeadDetails.fromHeadElement(headElement)
    return new this(headDetails, bodyElement)
  }

  readonly headDetails: HeadDetails
  readonly bodyElement: HTMLBodyElement

  constructor(headDetails: HeadDetails, bodyElement: HTMLBodyElement) {
    this.headDetails = headDetails
    this.bodyElement = bodyElement
  }

  clone(): Snapshot {
    const { bodyElement } = Snapshot.fromHTMLString(this.bodyElement.outerHTML)
    return new Snapshot(this.headDetails, bodyElement)
  }

  getRootLocation(): URL {
    const root = this.getSetting("root", "/")
    return expandURL(root)
  }

  getCacheControlValue() {
    return this.getSetting("cache-control")
  }

  getElementForAnchor(anchor: string) {
    try {
      return this.bodyElement.querySelector(`[id='${anchor}'], a[name='${anchor}']`)
    } catch {
      return null
    }
  }

  getPermanentElements() {
    return [ ...this.bodyElement.querySelectorAll("[id][data-turbo-permanent]") ]
  }

  getPermanentElementById(id: string) {
    return this.bodyElement.querySelector(`#${id}[data-turbo-permanent]`)
  }

  getPermanentElementsPresentInSnapshot(snapshot: Snapshot) {
    return this.getPermanentElements().filter(({ id }) => snapshot.getPermanentElementById(id))
  }

  findFirstAutofocusableElement() {
    return this.bodyElement.querySelector("[autofocus]")
  }

  hasAnchor(anchor: string) {
    return this.getElementForAnchor(anchor) != null
  }

  isPreviewable() {
    return this.getCacheControlValue() != "no-preview"
  }

  isCacheable() {
    return this.getCacheControlValue() != "no-cache"
  }

  isVisitable() {
    return this.getSetting("visit-control") != "reload"
  }

  // Private

  getSetting(name: string): string | undefined
  getSetting(name: string, defaultValue: string): string
  getSetting(name: string, defaultValue?: string) {
    const value = this.headDetails.getMetaValue(`turbo-${name}`)
    return value == null ? defaultValue : value
  }
}
