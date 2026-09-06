import { activateScriptElement, dispatch, parseHTMLDocument } from "../../util"

/**
 * Progressively renders HTML chunks from a streamed response into a target container.
 * Used when the server sends X-Turbo-Stream-Body: true and chunks delimited by <!-- turbo-chunk -->.
 */
export class StreamingBodyRenderer {
  constructor(fetchResponse, visit) {
    this.fetchResponse = fetchResponse
    this.visit = visit
  }

  async render() {
    const target = this.resolveTarget()
    if (!target) return

    let isFirstChunk = true

    for await (const chunk of this.fetchResponse.streamBodyChunks()) {
      const fragment = this.parseChunk(chunk)

      if (isFirstChunk) {
        this.injectFirstChunk(target, fragment)
        isFirstChunk = false
      } else {
        this.appendChunk(target, fragment)
      }
    }
  }

  resolveTarget() {
    const selector = this.fetchResponse.streamTarget
    const element = document.querySelector(selector)
    return element || document.body
  }

  parseChunk(html) {
    const trimmed = html.trim()
    const isFullDocument = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")
    return parseHTMLDocument(isFullDocument ? trimmed : `<html><body>${trimmed}</body></html>`)
  }

  injectFirstChunk(target, doc) {
    if (doc.head?.childNodes?.length) {
      for (const node of [...doc.head.childNodes]) {
        document.head.appendChild(document.adoptNode(node))
      }
    }
    target.replaceChildren()
    if (doc.body) {
      while (doc.body.firstChild) {
        target.appendChild(document.adoptNode(doc.body.firstChild))
      }
    }
  }

  appendChunk(target, doc) {
    const container = doc.body || doc.documentElement
    this.appendFragment(target, container)
  }

  appendFragment(target, container) {
    const event = dispatch("turbo:before-stream-render", {
      target: document.documentElement,
      cancelable: true,
      detail: { target, fragment: container }
    })
    if (event.defaultPrevented) return

    while (container.firstChild) {
      const node = document.adoptNode(container.firstChild)
      if (node.tagName === "SCRIPT") {
        target.appendChild(activateScriptElement(node))
      } else {
        target.appendChild(node)
      }
    }
  }
}
