import { activateScriptElement, nextAnimationFrame, dispatch } from "../../util"
import { Renderer } from "../renderer"
import { Morph } from "../morph"

export class FrameRenderer extends Renderer {
  static renderElement(currentElement, newElement) {
    if (currentElement.src && currentElement.refresh === "morph") {
      FrameRenderer.morph(currentElement, newElement)
    } else {
      FrameRenderer.replace(currentElement, newElement)
    }
  }

  static replace(currentElement, newElement) {
    const destinationRange = document.createRange()
    destinationRange.selectNodeContents(currentElement)
    destinationRange.deleteContents()

    const frameElement = newElement
    const sourceRange = frameElement.ownerDocument?.createRange()
    if (sourceRange) {
      sourceRange.selectNodeContents(frameElement)
      currentElement.appendChild(sourceRange.extractContents())
    }
  }

  static morph(currentElement, newElement) {
    dispatch("turbo:before-frame-morph", {
      target: currentElement,
      detail: { currentElement, newElement }
    })

    Morph.render(currentElement, newElement.children, "innerHTML")
  }

  constructor(delegate, currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
    super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender)
    this.delegate = delegate
  }

  get shouldRender() {
    return true
  }

  get renderMethod() {
    if (this.currentElement.refresh === "morph") {
      return "morph"
    } else {
      return super.renderMethod
    }
  }

  async render() {
    await nextAnimationFrame()
    this.preservingPermanentElements(() => {
      this.loadFrameElement()
    })
    this.scrollFrameIntoView()
    await nextAnimationFrame()
    this.focusFirstAutofocusableElement()
    await nextAnimationFrame()
    this.activateScriptElements()
  }

  loadFrameElement() {
    this.delegate.willRenderFrame(this.currentElement, this.newElement)
    this.renderElement(this.currentElement, this.newElement)
  }

  scrollFrameIntoView() {
    if (this.currentElement.autoscroll || this.newElement.autoscroll) {
      const element = this.currentElement.firstElementChild
      const block = readScrollLogicalPosition(this.currentElement.getAttribute("data-autoscroll-block"), "end")
      const behavior = readScrollBehavior(this.currentElement.getAttribute("data-autoscroll-behavior"), "auto")

      if (element) {
        element.scrollIntoView({ block, behavior })
        return true
      }
    }
    return false
  }

  activateScriptElements() {
    for (const inertScriptElement of this.newScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  get newScriptElements() {
    return this.currentElement.querySelectorAll("script")
  }
}

function readScrollLogicalPosition(value, defaultValue) {
  if (value == "end" || value == "start" || value == "center" || value == "nearest") {
    return value
  } else {
    return defaultValue
  }
}

function readScrollBehavior(value, defaultValue) {
  if (value == "auto" || value == "smooth") {
    return value
  } else {
    return defaultValue
  }
}
