import { expandPath } from "../core/url"

export interface LinkClickObserverDelegate {
  willFollowLinkToLocation(link: Element, location: URL): boolean
  followedLinkToLocation(link: Element, location: URL): void
}

export class LinkClickObserver {
  readonly delegate: LinkClickObserverDelegate
  started = false

  constructor(delegate: LinkClickObserverDelegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      addEventListener("click", this.clickCaptured, true)
      this.started = true
    }
  }

  stop() {
    if (this.started) {
      removeEventListener("click", this.clickCaptured, true)
      this.started = false
    }
  }

  clickCaptured = () => {
    removeEventListener("click", this.clickBubbled, false)
    addEventListener("click", this.clickBubbled, false)
  }

  clickBubbled = (event: MouseEvent) => {
    if (this.clickEventIsSignificant(event)) {
      const link = this.findLinkFromClickTarget(event.target)
      if (link) {
        const location = this.getLocationForLink(link)
        if (this.delegate.willFollowLinkToLocation(link, location)) {
          event.preventDefault()
          this.delegate.followedLinkToLocation(link, location)
        }
      }
    }
  }

  clickEventIsSignificant(event: MouseEvent) {
    return !(
      (event.target && (event.target as any).isContentEditable)
      || event.defaultPrevented
      || event.which > 1
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
    )
  }

  findLinkFromClickTarget(target: EventTarget | null) {
    if (target instanceof Element) {
      return target.closest("a[href]:not([target^=_]):not([download])")
    }
  }

  getLocationForLink(link: Element): URL {
    return expandPath(link.getAttribute("href") || "")
  }
}
