export type StreamRenderable = {
  targetElements: Element[],
  templateContent: DocumentFragment,
  removeDuplicates: boolean,
}

export enum StreamAction {
  after = "after",
  append = "append",
  before = "before",
  prepend = "prepend",
  remove = "remove",
  replace = "replace",
  update = "update",
  default = update,
}

export function streamActionFromString(action: string | null): StreamAction | null {
  switch (action?.toLowerCase()) {
    case "after":   return StreamAction.after
    case "append":  return StreamAction.append
    case "before":  return StreamAction.before
    case "prepend": return StreamAction.prepend
    case "remove":  return StreamAction.remove
    case "replace": return StreamAction.replace
    default:        return null
  }
}

export const StreamActions: { [action: string]: (this: StreamRenderable) => void } = {
  after() {
    this.targetElements.forEach(e => e.parentElement?.insertBefore(this.templateContent, e.nextSibling))
  },

  append() {
    if (this.removeDuplicates) {
      removeDuplicateTargetChildren(this)
    }
    this.targetElements.forEach(e => e.append(this.templateContent))
  },

  before() {
    this.targetElements.forEach(e => e.parentElement?.insertBefore(this.templateContent, e))
  },

  prepend() {
    if (this.removeDuplicates) {
      removeDuplicateTargetChildren(this)
    }
    this.targetElements.forEach(e => e.prepend(this.templateContent))
  },

  remove() {
    this.targetElements.forEach(e => e.remove())
  },

  replace() {
    this.targetElements.forEach(e => e.replaceWith(this.templateContent))
  },

  update() {
    this.targetElements.forEach(e => {
      e.innerHTML = ""
      e.append(this.templateContent)
    })
  }
}

/**
  * Removes duplicate children (by ID)
  */
const removeDuplicateTargetChildren = (streamRenderable: StreamRenderable) => {
  duplicateChildren(streamRenderable).forEach(c => c.remove())
}

/**
  * Gets the list of duplicate children (i.e. those with the same ID)
  */
const duplicateChildren = ({ targetElements, templateContent }: StreamRenderable) => {
  const existingChildren = targetElements.flatMap(e => [...e.children]).filter(c => !!c.id)
  const newChildrenIds   = [...templateContent?.children].filter(c => !!c.id).map(c => c.id)

  return existingChildren.filter(c => newChildrenIds.includes(c.id))
}
