import { Location } from "../core/location"

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

  get redirected() {
    return this.response.redirected
  }

  get location() {
    return Location.wrap(this.response.url)
  }

  get isHTML() {
    return this.contentType && this.contentType.match(/^text\/html|^application\/xhtml\+xml/)
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
