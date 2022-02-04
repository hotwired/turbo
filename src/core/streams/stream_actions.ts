import { StreamElement } from "../../elements/stream_element"

export const StreamActions: { [action: string]: (this: StreamElement) => void } = {
  after() {
    this.targetElements.forEach(e => {
      e.parentElement?.insertBefore(this.templateContent, e.nextSibling)
      dispatchAfterRenderEvent(e)
    })
  },

  append() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach(e => {
      e.append(this.templateContent)
      dispatchAfterRenderEvent(e)
    })
  },

  before() {
    this.targetElements.forEach(e => {
      e.parentElement?.insertBefore(this.templateContent, e)
      dispatchAfterRenderEvent(e)
    })
  },

  prepend() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach(e => {
      e.prepend(this.templateContent)
      dispatchAfterRenderEvent(e)
    })
  },

  remove() {
    this.targetElements.forEach(e => {
      e.remove()
      dispatchAfterRenderEvent()
    })
  },

  replace() {
    this.targetElements.forEach(e => {
      e.replaceWith(this.templateContent)
      dispatchAfterRenderEvent(e)
    })
  },

  update() {
    this.targetElements.forEach(e => { 
      e.innerHTML = ""
      e.append(this.templateContent)
      dispatchAfterRenderEvent(e)
    })
  }
}

const dispatchAfterRenderEvent = (target: HTMLElement = document.documentElement) => {
  target.dispatchEvent(new CustomEvent("turbo:after-stream-render", { bubbles: true, cancelable: true }))
}
