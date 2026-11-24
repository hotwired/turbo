import { elementIsStylesheet, parseHTMLDocument } from "../../util"
import { Snapshot } from "../snapshot"
import { expandURL } from "../url"
import { HeadSnapshot } from "./head_snapshot"

export class PageSnapshot extends Snapshot<HTMLBodyElement> {
  declare readonly documentElement: HTMLElement
  declare readonly headSnapshot: HeadSnapshot

  static fromHTMLString(html = ""): PageSnapshot {
    return this.fromDocument(parseHTMLDocument(html))
  }

  static fromElement(element: Element): PageSnapshot {
    return this.fromDocument(element.ownerDocument)
  }

  static fromDocument({ documentElement, body, head }: Document): PageSnapshot {
    return new this(documentElement, body as HTMLBodyElement, new HeadSnapshot(head))
  }

  constructor(documentElement: HTMLElement, body: HTMLBodyElement, headSnapshot: HeadSnapshot) {
    super(body)
    this.documentElement = documentElement
    this.headSnapshot = headSnapshot
  }

  clone(): PageSnapshot {
    const clonedElement = this.element.cloneNode(true) as HTMLBodyElement

    const selectElements = this.element.querySelectorAll("select")
    const clonedSelectElements = clonedElement.querySelectorAll("select")

    for (const [index, source] of selectElements.entries()) {
      const clone = clonedSelectElements[index]
      for (const option of clone.selectedOptions) option.selected = false
      for (const option of source.selectedOptions) clone.options[option.index].selected = true
    }

    for (const clonedPasswordInput of clonedElement.querySelectorAll<HTMLInputElement>('input[type="password"]')) {
      clonedPasswordInput.value = ""
    }

    for (const clonedNoscriptElement of clonedElement.querySelectorAll("noscript")) {
      for (const child of [...clonedNoscriptElement.children]) {
        if (elementIsStylesheet(child)) {
          child.remove()
        }
      }
    }

    return new PageSnapshot(this.documentElement, clonedElement, this.headSnapshot)
  }

  get lang(): string | null {
    return this.documentElement.getAttribute("lang")
  }

  get dir(): string | null {
    return this.documentElement.getAttribute("dir")
  }

  get headElement(): HTMLHeadElement {
    return this.headSnapshot.element
  }

  get rootLocation(): URL {
    const root = this.getSetting("root") ?? "/"
    return expandURL(root)
  }

  get cacheControlValue(): string | null {
    return this.getSetting("cache-control")
  }

  get isPreviewable(): boolean {
    return this.cacheControlValue != "no-preview"
  }

  get isCacheable(): boolean {
    return this.cacheControlValue != "no-cache"
  }

  get isVisitable(): boolean {
    return this.getSetting("visit-control") != "reload"
  }

  get prefersViewTransitions(): boolean {
    const viewTransitionEnabled = this.getSetting("view-transition") === "true" || this.headSnapshot.getMetaValue("view-transition") === "same-origin"
    return viewTransitionEnabled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  get refreshMethod(): string | null {
    return this.getSetting("refresh-method")
  }

  get refreshScroll(): string | null {
    return this.getSetting("refresh-scroll")
  }

  // Private

  getSetting(name: string): string | null {
    return this.headSnapshot.getMetaValue(`turbo-${name}`)
  }
}
