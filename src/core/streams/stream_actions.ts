import { StreamElement } from "../../elements/stream_element"

export const StreamActions: { [action: string]: (this: StreamElement) => void } = {
  append() {
    removeMatchingElements(this.templateContent, this.targetElement)

    this.targetElement?.append(this.templateContent)
  },

  prepend() {
    removeMatchingElements(this.templateContent, this.targetElement)

    this.targetElement?.prepend(this.templateContent)
  },

  remove() {
    this.targetElement?.remove()
  },

  replace() {
    this.targetElement?.replaceWith(this.templateContent)
  },

  update() {
    if (this.targetElement) {
      this.targetElement.innerHTML = ""
      this.targetElement.append(this.templateContent)
    }
  }
}

function removeMatchingElements(fragment: DocumentFragment, target: Element | null) {
  if (target) {
    for (const { id } of fragment.children) {
      [ ...target.children ].find(element => element.id == id)?.remove()
    }
  }
}
