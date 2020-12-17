import { FetchResponse } from "./fetch_response"
import { Location } from "./location"
import { dispatch } from "./util"

export interface FetchRequestDelegate {
  additionalHeadersForRequest?(request: FetchRequest): { [header: string]: string }
  requestStarted(request: FetchRequest): void
  requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse): void
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
    const url = this.location.absoluteURL
    const query = this.params.toString()
    if (this.isIdempotent && query.length) {
      return [url, query].join(url.includes("?") ? "&" : "?")
    } else {
      return url
    }
  }

  get params() {
    return this.entries.reduce((params, [name, value]) => {
      params.append(name, value.toString())
      return params
    }, new URLSearchParams)
  }

  get entries() {
    return this.body ? Array.from(this.body.entries()) : []
  }

  cancel() {
    this.abortController.abort()
  }

  async perform(): Promise<FetchResponse> {
    const { fetchOptions } = this
    dispatch("turbo:before-fetch-request", { detail: { fetchOptions } })
    try {
      this.delegate.requestStarted(this)
      const response = await fetch(this.url, fetchOptions)
      return await this.receive(response)
    } catch (error) {
      this.delegate.requestErrored(this, error)
      throw error
    } finally {
      this.delegate.requestFinished(this)
    }
  }

  async receive(response: Response): Promise<FetchResponse> {
    const fetchResponse = new FetchResponse(response)
    const event = dispatch("turbo:before-fetch-response", { cancelable: true, detail: { fetchResponse } })
    if (event.defaultPrevented) {
      this.delegate.requestPreventedHandlingResponse(this, fetchResponse)
    } else if (fetchResponse.succeeded) {
      this.delegate.requestSucceededWithResponse(this, fetchResponse)
    } else {
      this.delegate.requestFailedWithResponse(this, fetchResponse)
    }
    return fetchResponse
  }

  get fetchOptions(): RequestInit {
    return {
      method: FetchMethod[this.method].toUpperCase(),
      credentials: "same-origin",
      headers: this.headers,
      redirect: "follow",
      body: this.isIdempotent ? undefined : this.body,
      signal: this.abortSignal
    }
  }

  get isIdempotent() {
    return this.method == FetchMethod.get
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
