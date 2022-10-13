import { InitiationOptions } from "../core/types"
import { expandURL } from "../core/url"
import { uuid } from "../util"

export interface LinkClickObserverDelegate {
  willFollowLinkToLocation(link: Element, location: URL, options: InitiationOptions): boolean
  followedLinkToLocation(link: Element, location: URL, options: InitiationOptions): void
}

export class LinkClickObserver {
  readonly delegate: LinkClickObserverDelegate
  readonly eventTarget: EventTarget
  started = false

  constructor(delegate: LinkClickObserverDelegate, eventTarget: EventTarget) {
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start() {
    if (!this.started) {
      this.eventTarget.addEventListener("click", this.clickCaptured, true)
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      this.eventTarget.removeEventListener("click", this.clickCaptured, true)
      this.started = false
    }
  }

  clickCaptured = () => {
    this.eventTarget.removeEventListener("click", this.clickBubbled, false)
    this.eventTarget.addEventListener("click", this.clickBubbled, false)
  }

  clickBubbled = (event: Event) => {
    if (event instanceof MouseEvent && this.clickEventIsSignificant(event)) {
      const target = (event.composedPath && event.composedPath()[0]) || event.target
      const link = this.findLinkFromClickTarget(target)
      if (link && doesNotTargetIFrame(link)) {
        const location = this.getLocationForLink(link)
        const options = { lifecycleIdentifier: uuid(), event }
        if (this.delegate.willFollowLinkToLocation(link, location, options)) {
          event.preventDefault()
          this.delegate.followedLinkToLocation(link, location, options)
        }
      }
    }
  }

  clickEventIsSignificant(event: MouseEvent) {
    return !(
      (event.target && (event.target as any).isContentEditable) ||
      event.defaultPrevented ||
      event.which > 1 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
  }

  findLinkFromClickTarget(target: EventTarget | null) {
    if (target instanceof Element) {
      return target.closest<HTMLAnchorElement>("a[href]:not([target^=_]):not([download])")
    }
  }

  getLocationForLink(link: Element): URL {
    return expandURL(link.getAttribute("href") || "")
  }
}

function doesNotTargetIFrame(anchor: HTMLAnchorElement): boolean {
  for (const element of document.getElementsByName(anchor.target)) {
    if (element instanceof HTMLIFrameElement) return false
  }

  return true
}
