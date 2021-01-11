import { FetchRequestOptions } from "../http/fetch_request"
import { FetchResponse } from "../http/fetch_response"
import { StreamMessage } from "../core/streams/stream_message"
import { StreamSource } from "../core/types"

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
    if (!this.started) {
      this.started = true
      addEventListener("turbo:before-fetch-request", this.prepareFetchRequest, true)
      addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false)
    }
  }

  stop() {
    if (this.started) {
      this.started = false
      removeEventListener("turbo:before-fetch-request", this.prepareFetchRequest, true)
      removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false)
    }
  }

  connectStreamSource(source: StreamSource) {
    if (!this.streamSourceIsConnected(source)) {
      this.sources.add(source)
      source.addEventListener("message", this.receiveMessageEvent, false)
    }
  }

  disconnectStreamSource(source: StreamSource) {
    if (this.streamSourceIsConnected(source)) {
      this.sources.delete(source)
      source.removeEventListener("message", this.receiveMessageEvent, false)
    }
  }

  streamSourceIsConnected(source: StreamSource) {
    return this.sources.has(source)
  }

  prepareFetchRequest = <EventListener>((event: CustomEvent) => {
    const fetchOptions: FetchRequestOptions = event.detail?.fetchOptions
    if (fetchOptions) {
      const { headers } = fetchOptions
      headers.Accept = [ "text/vnd.turbo-stream.html", headers.Accept ].join(", ")
    }
  })

  inspectFetchResponse = <EventListener>((event: CustomEvent) => {
    const response = fetchResponseFromEvent(event)
    if (response && fetchResponseIsStream(response)) {
      event.preventDefault()
      this.receiveMessageResponse(response)
    }
  })

  receiveMessageEvent = (event: MessageEvent) => {
    if (this.started && typeof event.data == "string") {
      this.receiveMessageHTML(event.data)
    }
  }

  async receiveMessageResponse(response: FetchResponse) {
    const html = await response.responseHTML
    if (html) {
      this.receiveMessageHTML(html)
    }
  }

  receiveMessageHTML(html: string) {
    this.delegate.receivedMessageFromStream(new StreamMessage(html))
  }
}

function fetchResponseFromEvent(event: CustomEvent) {
  const fetchResponse = event.detail?.fetchResponse
  if (fetchResponse instanceof FetchResponse) {
    return fetchResponse
  }
}

function fetchResponseIsStream(response: FetchResponse) {
  const contentType = response.contentType ?? ""
  return /^text\/vnd\.turbo-stream\.html\b/.test(contentType)
}
