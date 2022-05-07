import { StreamElement } from "../../elements/stream_element"

export class StreamMessage {
  static readonly contentType = "text/vnd.turbo-stream.html"
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
      this.activateScriptElements(element)
      fragment.appendChild(document.importNode(element, true))
    }
    return fragment
  }

  get foreignElements() {
    return this.templateChildren.reduce((streamElements, child) => {
      if (child.tagName.toLowerCase() == "turbo-stream") {
        return [...streamElements, child as StreamElement]
      } else {
        return streamElements
      }
    }, [] as StreamElement[])
  }

  get templateChildren() {
    return Array.from(this.templateElement.content.children)
  }

  activateScriptElements(parentElement: StreamElement) {
    for (const inertScriptElement of ((parentElement.firstChild as HTMLMetaElement).content as unknown as Element).querySelectorAll("script")) {
      const activatedScriptElement = this.createScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  createScriptElement(element: Element) {
    if (element.getAttribute("data-turbo-eval") == "false") {
      return element
    } else {
      const createdScriptElement = document.createElement("script")
      createdScriptElement.setAttribute('data-renewed', 'true')
      createdScriptElement.textContent = element.textContent
      createdScriptElement.async = false
      this.copyElementAttributes(createdScriptElement, element)
      return createdScriptElement
    }
  }

  copyElementAttributes(destinationElement: Element, sourceElement: Element) {
    for (const { name, value } of [...sourceElement.attributes]) {
      destinationElement.setAttribute(name, value);
    }
  }


}
