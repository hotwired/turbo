import { FetchResponse } from "./fetch_response"
import { Location } from "./location"

export interface FetchRequestDelegate {
  additionalHeadersForRequest?(request: FetchRequest): { [header: string]: string }
  requestStarted(request: FetchRequest): void
  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse): void
  requestFailedWithResponse(request: FetchRequest, response: FetchResponse): void
  requestErrored(request: FetchRequest, error: Error): void
  requestFinished(request: FetchRequest): void
}

export enum FetchMethod {
  get,
  post,
  put,
  patch,
  delete
}

export function fetchMethodFromString(method: string) {
  switch (method.toLowerCase()) {
    case "get":    return FetchMethod.get
    case "post":   return FetchMethod.post
    case "put":    return FetchMethod.put
    case "patch":  return FetchMethod.patch
    case "delete": return FetchMethod.delete
  }
}

export type FetchRequestBody = FormData

export type FetchRequestHeaders = { [header: string]: string }

export interface FetchRequestOptions {
  headers: FetchRequestHeaders
  body: FetchRequestBody
  followRedirects: boolean
}

export class FetchRequest {
  readonly delegate: FetchRequestDelegate
  readonly method: FetchMethod
  readonly location: Location
  readonly body?: FetchRequestBody
  readonly abortController = new AbortController

  constructor(delegate: FetchRequestDelegate, method: FetchMethod, location: Location, body?: FetchRequestBody) {
    this.delegate = delegate
    this.method = method
    this.location = location
    this.body = body
  }

  get url() {
    return this.location.absoluteURL
  }

  abort() {
    this.abortController.abort()
  }

  async perform(): Promise<FetchResponse> {
    try {
      this.delegate.requestStarted(this)
      const fetchResponse = await fetch(this.url, this.fetchOptions)
      return await this.receive(fetchResponse)
    } catch (error) {
      this.delegate.requestErrored(this, error)
      throw error
    } finally {
      this.delegate.requestFinished(this)
    }
  }

  async receive(fetchResponse: Response): Promise<FetchResponse> {
    const response = new FetchResponse(fetchResponse)
    if (response.succeeded) {
      this.delegate.requestSucceededWithResponse(this, response)
    } else {
      this.delegate.requestFailedWithResponse(this, response)
    }
    return response
  }

  get fetchOptions(): RequestInit {
    return {
      method: FetchMethod[this.method].toUpperCase(),
      credentials: "same-origin",
      headers: this.headers,
      redirect: "follow",
      body: this.body,
      signal: this.abortSignal
    }
  }

  get headers() {
    return {
      "Accept": "text/html, application/xhtml+xml",
      ...this.additionalHeaders
    }
  }

  get additionalHeaders() {
    if (typeof this.delegate.additionalHeadersForRequest == "function") {
      return this.delegate.additionalHeadersForRequest(this)
    } else {
      return {}
    }
  }

  get abortSignal() {
    return this.abortController.signal
  }
}
