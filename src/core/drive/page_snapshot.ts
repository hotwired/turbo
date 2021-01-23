import { HeadDetails } from "./head_details"
import { expandURL } from "../url"

export class PageSnapshot {
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

  clone(): PageSnapshot {
    const { bodyElement } = PageSnapshot.fromHTMLString(this.bodyElement.outerHTML)
    return new PageSnapshot(this.headDetails, bodyElement)
  }

  get rootLocation(): URL {
    const root = this.getSetting("root", "/")
    return expandURL(root)
  }

  get cacheControlValue() {
    return this.getSetting("cache-control")
  }

  getElementForAnchor(anchor: string) {
    try {
      return this.bodyElement.querySelector(`[id='${anchor}'], a[name='${anchor}']`)
    } catch {
      return null
    }
  }

  get permanentElements() {
    return [ ...this.bodyElement.querySelectorAll("[id][data-turbo-permanent]") ]
  }

  getPermanentElementById(id: string) {
    return this.bodyElement.querySelector(`#${id}[data-turbo-permanent]`)
  }

  getPermanentElementsPresentInSnapshot(snapshot: PageSnapshot) {
    return this.permanentElements.filter(({ id }) => snapshot.getPermanentElementById(id))
  }

  get firstAutofocusableElement() {
    return this.bodyElement.querySelector("[autofocus]")
  }

  hasAnchor(anchor: string) {
    return this.getElementForAnchor(anchor) != null
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
    const value = this.headDetails.getMetaValue(`turbo-${name}`)
    return value == null ? defaultValue : value
  }
}
