import { StreamElement } from "../../elements/stream_element"

export type TurboStreamAction = (this: StreamElement) => void
export type TurboStreamActions = { [action: string]: TurboStreamAction }

export const StreamActions: TurboStreamActions = {
  after() {
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e.nextSibling))
  },

  append() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.append(this.templateContent))
  },

  before() {
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e))
  },

  prepend() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.prepend(this.templateContent))
  },

  remove() {
    this.targetElements.forEach((e) => e.remove())
  },

  replace() {
    this.targetElements.forEach((e) => e.replaceWith(this.templateContent))
  },

  update() {
    this.targetElements.forEach((e) => e.replaceChildren(this.templateContent))
  },
}
