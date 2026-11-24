import { activateScriptElement, createDocumentFragment } from "../../util"
import type { StreamElement } from "../../elements/stream_element"

export class StreamMessage {
  static contentType = "text/vnd.turbo-stream.html"
  declare readonly fragment: DocumentFragment

  static wrap(message: StreamMessage | string): StreamMessage {
    if (typeof message == "string") {
      return new this(createDocumentFragment(message))
    } else {
      return message
    }
  }

  constructor(fragment: DocumentFragment) {
    this.fragment = importStreamElements(fragment)
  }
}

function importStreamElements(fragment: DocumentFragment): DocumentFragment {
  for (const element of fragment.querySelectorAll<StreamElement>("turbo-stream")) {
    const streamElement = document.importNode(element, true)

    for (const inertScriptElement of streamElement.templateElement.content.querySelectorAll("script")) {
      inertScriptElement.replaceWith(activateScriptElement(inertScriptElement))
    }

    element.replaceWith(streamElement)
  }

  return fragment
}
