import { FetchResponse } from "../http/fetch_response"
import { StreamMessage } from "../core/streams/stream_message"
import type { StreamSource } from "../core/types"

export interface StreamObserverDelegate {
  receivedMessageFromStream(message: StreamMessage): void
}

export class StreamObserver {
  sources = new Set<StreamSource>()
  #started = false
  declare readonly delegate: StreamObserverDelegate

  constructor(delegate: StreamObserverDelegate) {
    this.delegate = delegate
  }

  start(): void {
    if (!this.#started) {
      this.#started = true
      addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false)
    }
  }

  stop(): void {
    if (this.#started) {
      this.#started = false
      removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false)
    }
  }

  connectStreamSource(source: StreamSource): void {
    if (!this.streamSourceIsConnected(source)) {
      this.sources.add(source)
      source.addEventListener("message", this.receiveMessageEvent, false)
    }
  }

  disconnectStreamSource(source: StreamSource): void {
    if (this.streamSourceIsConnected(source)) {
      this.sources.delete(source)
      source.removeEventListener("message", this.receiveMessageEvent, false)
    }
  }

  streamSourceIsConnected(source: StreamSource): boolean {
    return this.sources.has(source)
  }

  inspectFetchResponse = (event: Event) => {
    const response = fetchResponseFromEvent(event)
    if (response && fetchResponseIsStream(response)) {
      event.preventDefault()
      this.receiveMessageResponse(response)
    }
  }

  receiveMessageEvent = (event: MessageEvent) => {
    if (this.#started && typeof event.data == "string") {
      this.receiveMessageHTML(event.data)
    }
  }

  async receiveMessageResponse(response: FetchResponse): Promise<void> {
    const html = await response.responseHTML
    if (html) {
      this.receiveMessageHTML(html)
    }
  }

  receiveMessageHTML(html: string): void {
    this.delegate.receivedMessageFromStream(StreamMessage.wrap(html))
  }
}

function fetchResponseFromEvent(event: Event): FetchResponse | undefined {
  const fetchResponse = (event as CustomEvent<{ fetchResponse?: unknown } | undefined>).detail?.fetchResponse
  if (fetchResponse instanceof FetchResponse) {
    return fetchResponse
  }
}

function fetchResponseIsStream(response: FetchResponse): boolean {
  const contentType = response.contentType ?? ""
  return contentType.startsWith(StreamMessage.contentType)
}
