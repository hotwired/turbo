import { connectStreamSource, disconnectStreamSource } from "../core/index"

export class StreamSourceElement extends HTMLElement {
  streamSource: WebSocket | EventSource | null = null

  connectedCallback(): void {
    this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src)

    connectStreamSource(this.streamSource)
  }

  disconnectedCallback(): void {
    if (this.streamSource) {
      this.streamSource.close()

      disconnectStreamSource(this.streamSource)
    }
  }

  get src(): string {
    return this.getAttribute("src") || ""
  }
}
