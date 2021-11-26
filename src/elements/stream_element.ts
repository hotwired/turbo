import { StreamActions } from "../core/streams/stream_actions"
import { nextAnimationFrame } from "../util"

// <turbo-stream action=replace target=id><template>...

/**
 * Renders updates to the page from a stream of messages.
 *
 * Using the `action` attribute, this can be configured one of four ways:
 *
 * - `append` - appends the result to the container
 * - `append_unless_duplicate` - appends the result to the container only if there are no duplicate children
 * - `prepend` - prepends the result to the container
 * - `prepend_unless_duplicate` - prepends the result to the container only if there are no duplicate children
 * - `replace` - replaces the contents of the container
 * - `remove` - removes the container
 * - `before` - inserts the result before the target
 * - `after` - inserts the result after the target
 *
 * @customElement turbo-stream
 * @example
 *   <turbo-stream action="append" target="dom_id">
 *     <template>
 *       Content to append to container designated with the dom_id.
 *     </template>
 *   </turbo-stream>
 */
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
 
  /**
   * Removes duplicate children (by ID)
   */
  removeDuplicateTargetChildren() {
    this.duplicateChildren.forEach(c => c.remove())
  }
  
  /**
   * Gets the list of duplicate children (i.e. those with the same ID)
   */
  get duplicateChildren() {
    const existingChildren = this.targetElements.flatMap(e => [...e.children]).filter(c => !!c.id)
    const newChildrenIds   = [...this.templateContent?.children].filter(c => !!c.id).map(c => c.id)
  
    return existingChildren.filter(c => newChildrenIds.includes(c.id))
  }

  /**
   * Checks for any duplicate children (i.e. those with the same ID)
   */
  get hasDuplicateChildren() {
    return !!this.duplicateChildren.length
  }
  

  /**
   * Gets the action function to be performed.
   */
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

  /**
   * Gets the target elements which the template will be rendered to.
   */
  get targetElements() {
    if (this.target) { 
      return this.targetElementsById
    } else if (this.targets) {
      return this.targetElementsByQuery
    } else {
      this.raise("target or targets attribute is missing")
    }
  }

  /**
   * Gets the contents of the main `<template>`.
   */
  get templateContent() {
    return this.templateElement.content.cloneNode(true)
  }

  /**
   * Gets the main `<template>` used for rendering
   */
  get templateElement() {
    if (this.firstElementChild instanceof HTMLTemplateElement) {
      return this.firstElementChild
    }
    this.raise("first child element must be a <template> element")
  }

  /**
   * Gets the current action.
   */
  get action() {
    return this.getAttribute("action")
  }

  /**
   * Gets the current target (an element ID) to which the result will
   * be rendered.
   */
  get target() {
    return this.getAttribute("target")
  }

  /**
   * Gets the current "targets" selector (a CSS selector)
   */
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
