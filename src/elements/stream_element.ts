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

  get targetElements(): Array<Element> {
    // Try to get the target node by first looking it up by ID.
    // If that fails, try using the target as a CSS Selector.
    if (!this.target) {
      this.raise("target attribute is missing")
    }
    const idTarget = this.ownerDocument?.getElementById(this.target)
    if (idTarget !== null) {
      return [idTarget]
    }
    const cssTarget = this.ownerDocument?.querySelectorAll(this.target)
    if (cssTarget.length !== 0) {
      return Array.prototype.slice.call(cssTarget)
    }
    this.raise(`target "${this.target}" not found`)
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

  private raise(message: string): never {
    throw new Error(`${this.description}: ${message}`)
  }

  private get description() {
    return (this.outerHTML.match(/<[^>]+>/) ?? [])[0] ?? "<turbo-stream>"
  }

  private get beforeRenderEvent() {
    return new CustomEvent("turbo:before-stream-render", { bubbles: true, cancelable: true })
  }
}
