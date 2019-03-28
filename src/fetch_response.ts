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

  header(name: string) {
    return this.response.headers.get(name)
  }
}
