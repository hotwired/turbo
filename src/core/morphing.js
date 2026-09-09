import { Idiomorph } from "idiomorph"
import { FrameElement } from "../elements/frame_element"
import { dispatch } from "../util"
import { urlsAreEqual } from "./url"

/**
 * Morph the state of the currentElement based on the attributes and contents of
 * the newElement. Morphing may dispatch turbo:before-morph-element,
 * turbo:before-morph-attribute, and turbo:morph-element events.
 *
 * @param currentElement Element destination of morphing changes
 * @param newElement Element source of morphing changes
 */
export function morphElements(currentElement, newElement, { callbacks, ...options } = {}) {
  Idiomorph.morph(currentElement, newElement, {
    ...options,
    callbacks: new DefaultIdiomorphCallbacks(callbacks)
  })
}

/**
 * Morph the child elements of the currentElement based on the child elements of
 * the newElement. Morphing children may dispatch turbo:before-morph-element,
 * turbo:before-morph-attribute, and turbo:morph-element events.
 *
 * @param currentElement Element destination of morphing children changes
 * @param newElement Element source of morphing children changes
 */
export function morphChildren(currentElement, newElement, options = {}) {
  morphElements(currentElement, newElement.childNodes, {
    ...options,
    morphStyle: "innerHTML"
  })
}

export function shouldRefreshFrameWithMorphing(currentFrame, newFrame) {
  return currentFrame instanceof FrameElement &&
    currentFrame.shouldReloadWithMorph && (!newFrame || areFramesCompatibleForRefreshing(currentFrame, newFrame)) &&
    !currentFrame.closest("[data-turbo-permanent]")
}

// Whether an application has opted a refresh="morph" frame out of being
// refreshed by a page or ancestor-frame morph. Evaluated at the morph decision
// point, before compatibility is checked, so it covers every path a morph would
// otherwise take for the frame — matched-compatible (reload), matched-incompatible
// (morph in place), and missing-from-response (preserve). A frame opts out
// either declaratively with data-turbo-refresh-policy="manual" or imperatively
// by canceling the turbo:before-frame-refresh event. The application then owns
// the frame's refresh and teardown, exactly as with data-turbo-permanent, but
// scoped to morph refreshes rather than all navigation. `source` is "page-morph"
// or "frame-morph"; `newFrame` is the incoming counterpart, or undefined when the
// frame is absent from the new content.
export function shouldPreserveFrameDuringMorphRefresh(currentFrame, newFrame, source) {
  if (!(currentFrame instanceof FrameElement) || !currentFrame.shouldReloadWithMorph) return false
  if (currentFrame.refreshPolicy === "manual") return true

  const event = dispatch("turbo:before-frame-refresh", {
    target: currentFrame,
    cancelable: true,
    detail: { newFrame, source }
  })

  return event.defaultPrevented
}

function areFramesCompatibleForRefreshing(currentFrame, newFrame) {
  // newFrame cannot yet be an instance of FrameElement because custom
  // elements don't get initialized until they're attached to the DOM, so
  // test its Element#nodeName instead
  return newFrame instanceof Element && newFrame.nodeName === "TURBO-FRAME" && currentFrame.id === newFrame.id &&
  (!newFrame.getAttribute("src") || urlsAreEqual(currentFrame.src, newFrame.getAttribute("src")))
}

export function closestFrameReloadableWithMorphing(node) {
  return node.parentElement.closest("turbo-frame[src][refresh=morph]")
}

class DefaultIdiomorphCallbacks {
  #beforeNodeMorphed

  constructor({ beforeNodeMorphed } = {}) {
    this.#beforeNodeMorphed = beforeNodeMorphed || (() => true)
  }

  beforeNodeAdded = (node) => {
    return !(node.id && node.hasAttribute("data-turbo-permanent") && document.getElementById(node.id))
  }

  beforeNodeMorphed = (currentElement, newElement) => {
    if (currentElement instanceof Element) {
      if (!currentElement.hasAttribute("data-turbo-permanent") && this.#beforeNodeMorphed(currentElement, newElement)) {
        const event = dispatch("turbo:before-morph-element", {
          cancelable: true,
          target: currentElement,
          detail: { currentElement, newElement }
        })

        return !event.defaultPrevented
      } else {
        return false
      }
    }
  }

  beforeAttributeUpdated = (attributeName, target, mutationType) => {
    const event = dispatch("turbo:before-morph-attribute", {
      cancelable: true,
      target,
      detail: { attributeName, mutationType }
    })

    return !event.defaultPrevented
  }

  beforeNodeRemoved = (node) => {
    return this.beforeNodeMorphed(node)
  }

  afterNodeMorphed = (currentElement, newElement) => {
    if (currentElement instanceof Element) {
      dispatch("turbo:morph-element", {
        target: currentElement,
        detail: { currentElement, newElement }
      })
    }
  }
}
