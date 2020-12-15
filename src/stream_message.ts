import { StreamElement } from "./elements/stream_element"

export class StreamMessage {
  static readonly contentType = "text/html; turbo-stream; charset=utf-8"

  readonly templateElement = document.createElement("template")

  static wrap(message: StreamMessage | string) {
    if (typeof message == "string") {
      return new this(message)
    } else {
      return message
    }
  }

  constructor(html: string) {
    this.templateElement.innerHTML = html
  }

  get fragment() {
    const fragment = document.createDocumentFragment()
    for (const element of this.foreignElements) {
      fragment.appendChild(document.importNode(element, true))
    }
    return fragment
  }

  get foreignElements() {
    return this.templateChildren.reduce((streamElements, child) => {
      if (child.tagName.toLowerCase() == "turbo-stream") {
        return [ ...streamElements, child as StreamElement ]
      } else {
        return streamElements
      }
    }, [] as StreamElement[])
  }

  get templateChildren() {
    return Array.from(this.templateElement.content.children)
  }
}
