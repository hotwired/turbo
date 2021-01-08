import { expandPath } from "../core/url"

export class FetchResponse {
  readonly response: Response

  constructor(response: Response) {
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

  get location(): URL {
    return expandPath(this.response.url)
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

  get responseText(): Promise<string> {
    return this.response.text()
  }

  get responseHTML(): Promise<string | undefined> {
    if (this.isHTML) {
      return this.response.text()
    } else {
      return Promise.resolve(undefined)
    }
  }

  header(name: string) {
    return this.response.headers.get(name)
  }
}
