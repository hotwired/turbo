import { connectStreamSource, disconnectStreamSource } from "../core/index"

export class StreamSourceElement extends HTMLElement {
  streamSource = null

  connectedCallback() {
    this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src)

    connectStreamSource(this.streamSource)
  }

  disconnectedCallback() {
    if (this.streamSource) {
      this.streamSource.close()

      disconnectStreamSource(this.streamSource)
    }
  }

  get src() {
    return this.getAttribute("src") || ""
  }
}
