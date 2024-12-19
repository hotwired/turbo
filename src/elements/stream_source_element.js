import { connectStreamSource, disconnectStreamSource } from "../core/index"

export class StreamSourceElement extends HTMLElement {
  static observedAttributes = ["src"]

  streamSource = null

  connectedCallback() {
    this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src)

    connectStreamSource(this.streamSource)
    this.setAttribute("connected", "")
  }

  disconnectedCallback() {
    this.removeAttribute("connected")
    if (this.streamSource) {
      this.streamSource.close()

      disconnectStreamSource(this.streamSource)
    }
  }

  attributeChangedCallback() {
    if (this.streamSource) {
      this.disconnectedCallback()
      this.connectedCallback()
    }
  }

  get src() {
    return this.getAttribute("src") || ""
  }
}
