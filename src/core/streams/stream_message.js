import { activateScriptElement, createDocumentFragment } from "../../util"

export class StreamMessage {
  static contentType = "text/vnd.turbo-stream.html"

  static wrap(message) {
    if (typeof message == "string") {
      return new this(createDocumentFragment(message))
    } else {
      return message
    }
  }

  constructor(fragment) {
    this.fragment = importStreamElements(fragment)
  }
}

function importStreamElements(fragment) {
  for (const element of fragment.querySelectorAll("turbo-stream")) {
    const streamElement = document.importNode(element, true)

    for (const inertScriptElement of streamElement.templateElement.content.querySelectorAll("script")) {
      inertScriptElement.replaceWith(activateScriptElement(inertScriptElement))
    }

    element.replaceWith(streamElement)
  }

  return fragment
}
