import { StreamActions } from "../stream_actions"

// <turbo-stream action=replace target=id><template>...

export class StreamElement extends HTMLElement {
  connectedCallback() {
    try {
      this.actionFunction.call(this)
    } catch (error) {
      console.error(error)
    } finally {
      try { this.remove() } catch {}
    }
  }

  get actionFunction() {
    if (this.action) {
      const actionFunction = StreamActions[this.action]
      if (actionFunction) {
        return actionFunction
      }
      this.raise("unknown action")
    }
    this.raise("action attribute is missing")
  }

  get targetElement() {
    if (this.target) {
      const targetElement = this.ownerDocument?.getElementById(this.target)
      if (targetElement) {
        return targetElement
      }
      this.raise("can't find target element")
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
}

customElements.define("turbo-stream", StreamElement)
