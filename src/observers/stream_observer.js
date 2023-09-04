import { FetchResponse } from "../http/fetch_response"
import { StreamMessage } from "../core/streams/stream_message"

export class StreamObserver {
  sources = new Set()
  #started = false

  constructor(delegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.#started) {
      this.#started = true
      addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false)
    }
  }

  stop() {
    if (this.#started) {
      this.#started = false
      removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false)
    }
  }

  connectStreamSource(source) {
    if (!this.streamSourceIsConnected(source)) {
      this.sources.add(source)
      source.addEventListener("message", this.receiveMessageEvent, false)
    }
  }

  disconnectStreamSource(source) {
    if (this.streamSourceIsConnected(source)) {
      this.sources.delete(source)
      source.removeEventListener("message", this.receiveMessageEvent, false)
    }
  }

  streamSourceIsConnected(source) {
    return this.sources.has(source)
  }

  inspectFetchResponse = ((event) => {
    const response = fetchResponseFromEvent(event)
    if (response && fetchResponseIsStream(response)) {
      event.preventDefault()
      this.receiveMessageResponse(response)
    }
  })

  receiveMessageEvent = (event) => {
    if (this.#started && typeof event.data == "string") {
      this.receiveMessageHTML(event.data)
    }
  }

  async receiveMessageResponse(response) {
    const html = await response.responseHTML
    if (html) {
      this.receiveMessageHTML(html)
    }
  }

  receiveMessageHTML(html) {
    this.delegate.receivedMessageFromStream(StreamMessage.wrap(html))
  }
}

function fetchResponseFromEvent(event) {
  const fetchResponse = event.detail?.fetchResponse
  if (fetchResponse instanceof FetchResponse) {
    return fetchResponse
  }
}

function fetchResponseIsStream(response) {
  const contentType = response.contentType ?? ""
  return contentType.startsWith(StreamMessage.contentType)
}
