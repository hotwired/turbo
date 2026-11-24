import { Idiomorph, type ConfigCallbacks as IdiomorphCallbacks } from "idiomorph"

import { FrameElement } from "../elements/frame_element"
import { dispatch } from "../util"
import { urlsAreEqual } from "./url"
import type { MorphMutationType } from "./events"

/**
 * Options for morphing elements. Declared here rather than re-exported from
 * idiomorph, which is bundled and not installed alongside Turbo.
 */
export interface MorphOptions {
  callbacks?: {
    /** Also called with no newElement when a node is about to be removed. */
    beforeNodeMorphed?(currentElement: Element, newElement?: Node): boolean
  }
  morphStyle?: "innerHTML" | "outerHTML"
  ignoreActive?: boolean
  ignoreActiveValue?: boolean
  restoreFocus?: boolean
  head?: {
    style?: "merge" | "append" | "morph" | "none"
    block?: boolean
    shouldPreserve?(element: Element): boolean
    shouldReAppend?(element: Element): boolean
    shouldRemove?(element: Element): boolean
    afterHeadMorphed?(element: Element, changes: { added: Node[]; kept: Element[]; removed: Element[] }): void
  }
}

/**
 * Morph the state of the currentElement based on the attributes and contents of
 * the newElement. Morphing may dispatch turbo:before-morph-element,
 * turbo:before-morph-attribute, and turbo:morph-element events.
 *
 * @param currentElement Element destination of morphing changes
 * @param newElement Element or HTML string source of morphing changes
 */
export function morphElements(
  currentElement: Element,
  newElement: Element | DocumentFragment | NodeListOf<ChildNode> | ChildNode[] | string,
  { callbacks, ...options }: MorphOptions = {}
): void {
  // TODO(types): idiomorph's types omit NodeList and DocumentFragment, which it accepts at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Idiomorph.morph(currentElement, newElement as any, {
    ...options,
    callbacks: new DefaultIdiomorphCallbacks(callbacks) as IdiomorphCallbacks
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
export function morphChildren(currentElement: Element, newElement: Element | DocumentFragment, options: MorphOptions = {}): void {
  morphElements(currentElement, newElement.childNodes, {
    ...options,
    morphStyle: "innerHTML"
  })
}

export function shouldRefreshFrameWithMorphing(currentFrame: Element | null, newFrame?: Node | null) {
  return currentFrame instanceof FrameElement &&
    currentFrame.shouldReloadWithMorph && (!newFrame || areFramesCompatibleForRefreshing(currentFrame, newFrame)) &&
    !currentFrame.closest("[data-turbo-permanent]")
}

function areFramesCompatibleForRefreshing(currentFrame: FrameElement, newFrame: Node): boolean {
  // newFrame cannot yet be an instance of FrameElement because custom
  // elements don't get initialized until they're attached to the DOM, so
  // test its Element#nodeName instead
  return newFrame instanceof Element && newFrame.nodeName === "TURBO-FRAME" && currentFrame.id === newFrame.id &&
  (!newFrame.getAttribute("src") || urlsAreEqual(currentFrame.src!, newFrame.getAttribute("src")!))
}

export function closestFrameReloadableWithMorphing(node: Element): FrameElement | null {
  return node.parentElement!.closest<FrameElement>("turbo-frame[src][refresh=morph]")
}

class DefaultIdiomorphCallbacks {
  #beforeNodeMorphed: (currentElement: Element, newElement?: Node) => boolean

  constructor({ beforeNodeMorphed }: NonNullable<MorphOptions["callbacks"]> = {}) {
    this.#beforeNodeMorphed = beforeNodeMorphed || (() => true)
  }

  beforeNodeAdded = (node: Node): boolean => {
    return !((node as Element).id && (node as Element).hasAttribute("data-turbo-permanent") && document.getElementById((node as Element).id))
  }

  // Returns undefined for non-element nodes; idiomorph only treats `false` as a veto.
  beforeNodeMorphed = (currentElement: Node, newElement?: Node): boolean | undefined => {
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

  beforeAttributeUpdated = (attributeName: string, target: Element, mutationType: MorphMutationType): boolean => {
    const event = dispatch("turbo:before-morph-attribute", {
      cancelable: true,
      target,
      detail: { attributeName, mutationType }
    })

    if (event.defaultPrevented) return false

    // Removing [open] would hide a modal <dialog> but leave it in the top layer, blocking the page
    if (target instanceof HTMLDialogElement && attributeName === "open" && mutationType === "remove") {
      target.close()
      return false
    }

    return true
  }

  beforeNodeRemoved = (node: Node): boolean | undefined => {
    return this.beforeNodeMorphed(node)
  }

  afterNodeMorphed = (currentElement: Node, newElement: Node): void => {
    if (currentElement instanceof Element) {
      dispatch("turbo:morph-element", {
        target: currentElement,
        detail: { currentElement, newElement }
      })
    }
  }
}
