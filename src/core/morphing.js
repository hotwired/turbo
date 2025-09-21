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

/**
 * Morph the state of the currentBody based on the attributes and contents of
 * the newBody. Morphing body elements may dispatch turbo:morph,
 * turbo:before-morph-element, turbo:before-morph-attribute, and
 * turbo:morph-element events.
 *
 * @param currentBody HTMLBodyElement destination of morphing changes
 * @param newBody HTMLBodyElement source of morphing changes
 */
export function morphBodyElements(currentElement, newElement) {
  morphElements(currentElement, newElement, {
    callbacks: {
      beforeNodeMorphed: (node, newNode) => {
        if (
          shouldRefreshFrameWithMorphing(node, newNode) &&
          !closestFrameReloadableWithMorphing(node)
        ) {
          node.reload()
          return false
        }
        return true
      }
    }
  })

  dispatch("turbo:morph", { detail: { currentElement, newElement } })
}

/**
 * Morph the child elements of the currentFrame based on the child elements of
 * the newFrame. Morphing turbo-frame elements may dispatch turbo:before-frame-morph,
 * turbo:before-morph-element, turbo:before-morph-attribute, and
 * turbo:morph-element events.
 *
 * @param currentFrame FrameElement destination of morphing children changes
 * @param newFrame FrameElement source of morphing children changes
 */
export function morphTurboFrameElements(currentElement, newElement) {
  dispatch("turbo:before-frame-morph", {
    target: currentElement,
    detail: { currentElement, newElement }
  })

  morphChildren(currentElement, newElement, {
    callbacks: {
      beforeNodeMorphed: (node, newNode) => {
        if (
          shouldRefreshFrameWithMorphing(node, newNode) &&
          closestFrameReloadableWithMorphing(node) === currentElement
        ) {
          node.reload()
          return false
        }
        return true
      }
    }
  })
}

export function shouldRefreshFrameWithMorphing(currentFrame, newFrame) {
  return currentFrame instanceof FrameElement &&
    // newFrame cannot yet be an instance of FrameElement because custom
    // elements don't get initialized until they're attached to the DOM, so
    // test its Element#nodeName instead
    newFrame instanceof Element && newFrame.nodeName === "TURBO-FRAME" &&
    currentFrame.shouldReloadWithMorph &&
    currentFrame.id === newFrame.id &&
    (!newFrame.getAttribute("src") || urlsAreEqual(currentFrame.src, newFrame.getAttribute("src"))) &&
    !currentFrame.closest("[data-turbo-permanent]")
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
