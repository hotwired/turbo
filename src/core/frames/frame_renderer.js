import { activateScriptElement, nextEventLoopTick } from "../../util"
import { Renderer } from "../renderer"

export class FrameRenderer extends Renderer {
  static renderElement(currentElement, newElement) {
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

  constructor(delegate, currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
    super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender)
    this.delegate = delegate
  }

  get shouldRender() {
    return true
  }

  async render() {
    await nextEventLoopTick()
    this.preservingPermanentElements(() => {
      this.loadFrameElement()
    })
    this.scrollFrameIntoView()
    await nextEventLoopTick()
    this.focusFirstAutofocusableElement()
    await nextEventLoopTick()
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
