import { expandURL } from "../core/url"

const TURBO_CHUNK_DELIMITER = "<!-- turbo-chunk -->"

export class FetchResponse {
  constructor(response) {
    this.response = response
  }

  get succeeded() {
    return this.response.ok
  }

  get failed() {
    return !this.succeeded
  }

  get clientError() {
    return this.statusCode >= 400 && this.statusCode <= 499
  }

  get serverError() {
    return this.statusCode >= 500 && this.statusCode <= 599
  }

  get redirected() {
    return this.response.redirected
  }

  get location() {
    return expandURL(this.response.url)
  }

  get isHTML() {
    return this.contentType && this.contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/)
  }

  get statusCode() {
    return this.response.status
  }

  get contentType() {
    return this.header("Content-Type")
  }

  /**
   * When true, the server requests progressive rendering. Turbo will stream the response
   * body instead of buffering it, and inject chunks delimited by <!-- turbo-chunk -->.
   */
  get isStreamBody() {
    return this.header("X-Turbo-Stream-Body") === "true"
  }

  /**
   * Target selector for streaming chunks. Defaults to "main" or "body" if not specified.
   */
  get streamTarget() {
    return this.header("X-Turbo-Stream-Target") || "main"
  }

  get responseText() {
    return this.response.clone().text()
  }

  get responseHTML() {
    if (this.isHTML) {
      return this.response.clone().text()
    } else {
      return Promise.resolve(undefined)
    }
  }

  header(name) {
    return this.response.headers.get(name)
  }

  /**
   * Async generator that yields complete HTML chunks between delimiters.
   * Only use when isStreamBody is true — do not call responseHTML after this.
   */
  async *streamBodyChunks() {
    if (!this.response.body) return

    const reader = this.response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        while (buffer.includes(TURBO_CHUNK_DELIMITER)) {
          const [chunk, rest] = buffer.split(TURBO_CHUNK_DELIMITER, 2)
          buffer = rest || ""
          const trimmed = chunk.trim()
          if (trimmed) yield trimmed
        }
      }

      if (buffer.trim()) yield buffer.trim()
    } finally {
      reader.releaseLock()
    }
  }
}
