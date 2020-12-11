import { StreamMessage } from "./stream_message"
import { StreamSource } from "./types"

export interface StreamObserverDelegate {
  receivedMessageFromStream(message: StreamMessage): void
}

export class StreamObserver {
  readonly delegate: StreamObserverDelegate
  readonly sources: Set<StreamSource> = new Set
  private started = false

  constructor(delegate: StreamObserverDelegate) {
    this.delegate = delegate
  }

  start() {
    this.started = true
  }

  stop() {
    this.started = false
  }

  connectStreamSource(source: StreamSource) {
    if (!this.streamSourceIsConnected(source)) {
      this.sources.add(source)
      source.addEventListener("message", this.handleMessage, false)
    }
  }

  disconnectStreamSource(source: StreamSource) {
    if (this.streamSourceIsConnected(source)) {
      this.sources.delete(source)
      source.removeEventListener("message", this.handleMessage, false)
    }
  }

  streamSourceIsConnected(source: StreamSource) {
    return this.sources.has(source)
  }

  handleMessage = (event: MessageEvent) => {
    if (this.started && typeof event.data == "string") {
      const message = new StreamMessage(event.data)
      this.delegate.receivedMessageFromStream(message)
    }
  }
}
