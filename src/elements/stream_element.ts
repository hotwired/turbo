import { StreamActions, type TurboStreamAction } from "../core/streams/stream_actions"
import { nextRepaint } from "../util"

export type StreamElementRender = (newElement: StreamElement) => Promise<void>

export type TurboBeforeStreamRenderEvent = CustomEvent<{ newStream: StreamElement; render: StreamElementRender }>

// <turbo-stream action=replace target=id><template>...

/**
 * Renders updates to the page from a stream of messages.
 *
 * Using the `action` attribute, this can be configured one of eight ways:
 *
 * - `after` - inserts the result after the target
 * - `append` - appends the result to the target
 * - `before` - inserts the result before the target
 * - `prepend` - prepends the result to the target
 * - `refresh` - initiates a page refresh
 * - `remove` - removes the target
 * - `replace` - replaces the outer HTML of the target
 * - `update` - replaces the inner HTML of the target
 *
 * @customElement turbo-stream
 * @example
 *   <turbo-stream action="append" target="dom_id">
 *     <template>
 *       Content to append to target designated with the dom_id.
 *     </template>
 *   </turbo-stream>
 */
export class StreamElement extends HTMLElement {
  declare renderPromise?: Promise<void>

  static async renderElement(newElement: StreamElement): Promise<void> {
    await newElement.performAction()
  }

  async connectedCallback(): Promise<void> {
    try {
      await this.render()
    } catch (error) {
      console.error(error)
    } finally {
      this.disconnect()
    }
  }

  async render(): Promise<void> {
    return (this.renderPromise ??= (async () => {
      const event = this.beforeRenderEvent

      if (this.dispatchEvent(event)) {
        await nextRepaint()
        await event.detail.render(this)
      }
    })())
  }

  disconnect(): void {
    try {
      this.remove()
      // eslint-disable-next-line no-empty
    } catch {}
  }

  /**
   * Removes duplicate children (by ID)
   */
  removeDuplicateTargetChildren(): void {
    this.duplicateChildren.forEach((c) => c.remove())
  }

  /**
   * Gets the list of duplicate children (i.e. those with the same ID)
   */
  get duplicateChildren(): Element[] {
    const existingChildren = this.targetElements.flatMap((e) => [...e.children]).filter((c) => !!c.getAttribute("id"))
    const newChildrenIds = [...(this.templateContent?.children || [])].filter((c) => !!c.getAttribute("id")).map((c) => c.getAttribute("id"))

    return existingChildren.filter((c) => newChildrenIds.includes(c.getAttribute("id")))
  }

  /**
  * Removes duplicate siblings (by ID)
  */
  removeDuplicateTargetSiblings(): void {
    this.duplicateSiblings.forEach((c) => c.remove())
  }

  /**
  * Gets the list of duplicate siblings (i.e. those with the same ID)
  */
  get duplicateSiblings(): Element[] {
    const existingChildren = this.targetElements.flatMap((e) => [...e.parentElement!.children]).filter((c) => !!c.id)
    const newChildrenIds = [...(this.templateContent?.children || [])].filter((c) => !!c.id).map((c) => c.id)

    return existingChildren.filter((c) => newChildrenIds.includes(c.id))
  }

  /**
   * Gets the action function to be performed.
   */
  get performAction(): TurboStreamAction {
    if (this.action) {
      const actionFunction = StreamActions[this.action]
      if (actionFunction) {
        return actionFunction
      }
      this.#raise("unknown action")
    }
    this.#raise("action attribute is missing")
  }

  /**
   * Gets the target elements which the template will be rendered to.
   */
  get targetElements(): Element[] {
    if (this.target) {
      return this.targetElementsById
    } else if (this.targets) {
      return this.targetElementsByQuery
    } else {
      this.#raise("target or targets attribute is missing")
    }
  }

  /**
   * Gets the contents of the main `<template>`.
   */
  get templateContent(): DocumentFragment {
    return this.templateElement.content.cloneNode(true) as DocumentFragment
  }

  /**
   * Gets the main `<template>` used for rendering
   */
  get templateElement(): HTMLTemplateElement {
    if (this.firstElementChild === null) {
      const template = this.ownerDocument.createElement("template")
      this.appendChild(template)
      return template
    } else if (this.firstElementChild instanceof HTMLTemplateElement) {
      return this.firstElementChild
    }
    this.#raise("first child element must be a <template> element")
  }

  /**
   * Gets the current action.
   */
  get action(): string | null {
    return this.getAttribute("action")
  }

  /**
   * Gets the current target (an element ID) to which the result will
   * be rendered.
   */
  get target(): string | null {
    return this.getAttribute("target")
  }

  /**
   * Gets the current "targets" selector (a CSS selector)
   */
  get targets(): string | null {
    return this.getAttribute("targets")
  }

  /**
   * Reads the request-id attribute
   */
  get requestId(): string | null {
    return this.getAttribute("request-id")
  }

  #raise(message: string): never {
    throw new Error(`${this.description}: ${message}`)
  }

  get description(): string {
    return (this.outerHTML.match(/<[^>]+>/) ?? [])[0] ?? "<turbo-stream>"
  }

  get beforeRenderEvent(): TurboBeforeStreamRenderEvent {
    return new CustomEvent("turbo:before-stream-render", {
      bubbles: true,
      cancelable: true,
      detail: { newStream: this, render: StreamElement.renderElement }
    })
  }

  get targetElementsById(): Element[] {
    const element = this.ownerDocument?.getElementById(this.target!)

    if (element !== null) {
      return [element]
    } else {
      return []
    }
  }

  get targetElementsByQuery(): Element[] {
    const elements = this.ownerDocument?.querySelectorAll(this.targets!)

    if (elements.length !== 0) {
      return Array.prototype.slice.call(elements)
    } else {
      return []
    }
  }
}
