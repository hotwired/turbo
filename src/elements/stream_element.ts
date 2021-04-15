import { StreamActions, StreamOperations } from "../core/streams/stream_actions"
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
      const event = this.beforeRenderEvent
      if (this.dispatchEvent(event)) {
        await nextAnimationFrame()
        this.performAction(event.detail.actions as StreamOperations).bind(this).call(this)
      }
    })()
  }

  disconnect() {
    try { this.remove() } catch {}
  }

  performAction(actions: StreamOperations) {
    if (this.action) {
      const actionFunction = actions[this.action]
      if (actionFunction) {
        return actionFunction
      }
      this.raise("unknown action")
    }
    this.raise("action attribute is missing")
  }

  get targetElement() {
    if (this.target) {
      return this.ownerDocument?.getElementById(this.target)
    }
    this.raise("target attribute is missing")
  }

  get templateContent() {
    return this.templateElement.content
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
    const actions = { ...StreamActions }
    return new CustomEvent("turbo:before-stream-render", { detail: { actions }, bubbles: true, cancelable: true })
  }
}
