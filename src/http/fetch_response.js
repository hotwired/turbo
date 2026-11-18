import { expandURL } from "../core/url"

export class FetchResponse {
  #requestFinished
  #responseText

  constructor(response, requestFinished = Promise.resolve()) {
    this.response = response
    this.#requestFinished = requestFinished
  }

  get requestFinished() {
    return this.#requestFinished
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
    try {
      return (this.#responseText ??= this.response.clone().text())
    } catch (error) {
      return (this.#responseText = Promise.reject(error))
    }
  }

  get responseHTML() {
    if (this.isHTML) {
      return this.responseText
    } else {
      return Promise.resolve(undefined)
    }
  }

  header(name) {
    return this.response.headers.get(name)
  }
}
