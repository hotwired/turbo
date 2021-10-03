import { StreamSource } from "../core/types"
import { connectStreamSource, disconnectStreamSource } from "../index"

export class StreamSourceElement extends HTMLElement {
  streamSource: StreamSource | null = null

  connectedCallback() {
    this.streamSource = this.src.match(/^ws{1,2}:/) ?
      new WebSocket(this.src) :
      new EventSource(this.src)

    connectStreamSource(this.streamSource)
  }

  disconnectedCallback() {
    if (this.streamSource) {
      disconnectStreamSource(this.streamSource)
    }
  }

  get src(): string {
    return this.getAttribute("src") || ""
  }
}
