import { expandURL } from "../core/url"

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

  get responseText() {
    return this.#decodeBody()
  }

  get responseHTML() {
    if (this.isHTML) {
      return this.#decodeBody()
    } else {
      return Promise.resolve(undefined)
    }
  }

  // Response#text always decodes the body as UTF-8, so when the Content-Type
  // header declares another charset, decode the body stream with that charset.
  async #decodeBody() {
    const decoder = this.#decoderForContentType()
    if (decoder) {
      const reader = this.response.clone().body.getReader()
      let text = ""
      let done = false
      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) text += decoder.decode(result.value, { stream: true })
      }
      return text + decoder.decode()
    } else {
      return this.response.clone().text()
    }
  }

  #decoderForContentType() {
    const charset = this.contentType?.match(/charset\s*=\s*"?([\w-]+)"?/i)?.[1]
    if (charset && this.response.body) {
      try {
        const decoder = new TextDecoder(charset)
        if (decoder.encoding !== "utf-8") return decoder
      } catch {
        // an unknown charset falls back to the UTF-8 decoding of Response#text
      }
    }
    return null
  }

  header(name) {
    return this.response.headers.get(name)
  }
}
