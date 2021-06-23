import { StreamActions } from "../core/streams/stream_actions"
import { nextAnimationFrame } from "../util"

// <turbo-stream action=replace target=id><template>...

export class StreamElement extends HTMLElement {
  async connectedCallback() {
    try {
      await this.render()
    } catch (error) {
      console.error(error)
    } finally {
      this.disconnect()
    }
  }

  private renderPromise?: Promise<void>

  async render() {
    return this.renderPromise ??= (async () => {
      if (this.dispatchEvent(this.beforeRenderEvent)) {
        await nextAnimationFrame()
        this.performAction()
      }
    })()
  }

  disconnect() {
    try { this.remove() } catch {}
  }
 
  removeDuplicateTargetChildren() {
    this.duplicateChildren.forEach(c => c.remove())
  }
  
  get duplicateChildren() {
    const existingChildren = this.targetElements.flatMap(e => [...e.children]).filter(c => !!c.id)
    const newChildrenIds   = [...this.templateContent?.children].filter(c => !!c.id).map(c => c.id)
  
    return existingChildren.filter(c => newChildrenIds.includes(c.id))
  }
  
  get performAction() {
    if (this.action) {
      const actionFunction = StreamActions[this.action]
      if (actionFunction) {
        return actionFunction
      }
      this.raise("unknown action")
    }
    this.raise("action attribute is missing")
  }

  get targetElements() {
    if (this.target) { 
      return this.targetElementsById
    } else if (this.targets) {
      return this.targetElementsByQuery
    } else {
      this.raise("target or targets attribute is missing")
    }
  }

  get templateContent() {
    return this.templateElement.content.cloneNode(true)
  }

  get templateElement() {
    if (this.firstElementChild instanceof HTMLTemplateElement) {
      return this.firstElementChild
    }
    this.raise("first child element must be a <template> element")
  }

  get action() {
    return this.getAttribute("action")
  }

  get target() {
    return this.getAttribute("target")
  }

  get targets() {
    return this.getAttribute("targets")
  }

  private raise(message: string): never {
    throw new Error(`${this.description}: ${message}`)
  }

  private get description() {
    return (this.outerHTML.match(/<[^>]+>/) ?? [])[0] ?? "<turbo-stream>"
  }

  private get beforeRenderEvent() {
    return new CustomEvent("turbo:before-stream-render", { bubbles: true, cancelable: true })
  }

  private get targetElementsById() {
    const element = this.ownerDocument?.getElementById(this.target!)

    if (element !== null) {
      return [ element ]
    } else {
      return []
    }
  }

  private get targetElementsByQuery() {
    const elements = this.ownerDocument?.querySelectorAll(this.targets!)

    if (elements.length !== 0) {
      return Array.prototype.slice.call(elements)
    } else {
      return []
    }
  }
}
