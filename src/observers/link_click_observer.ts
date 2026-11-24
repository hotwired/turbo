import { getLocationForLink } from "../core/url"
import { doesNotTargetIFrame, findLinkFromClickTarget } from "../util"

export interface LinkClickObserverDelegate {
  willFollowLinkToLocation(link: HTMLAnchorElement | SVGAElement, location: URL, event: MouseEvent): boolean
  followedLinkToLocation(link: HTMLAnchorElement | SVGAElement, location: URL): void
}

export class LinkClickObserver {
  started = false
  declare readonly delegate: LinkClickObserverDelegate
  declare readonly eventTarget: EventTarget

  constructor(delegate: LinkClickObserverDelegate, eventTarget: EventTarget) {
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start(): void {
    if (!this.started) {
      this.eventTarget.addEventListener("click", this.clickCaptured, true)
      this.started = true
    }
  }

  stop(): void {
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
      const link = findLinkFromClickTarget(target)
      // TODO(types): for SVGAElement, `target` is an SVGAnimatedString, so this looks up
      // "[object SVGAnimatedString]". Likely upstream bug; kept as-is.

      if (link && doesNotTargetIFrame(link.target as string)) {
        const location = getLocationForLink(link)
        if (this.delegate.willFollowLinkToLocation(link, location, event)) {
          event.preventDefault()
          this.delegate.followedLinkToLocation(link, location)
        }
      }
    }
  }

  clickEventIsSignificant(event: MouseEvent): boolean {
    return !(
      (event.target && (event.target as HTMLElement).isContentEditable) ||

      event.defaultPrevented ||
      event.which > 1 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
  }
}
