import { FetchResponse } from "./fetch_response"
import { dispatch } from "../util"

export interface FetchRequestDelegate {
  additionalHeadersForRequest?(request: FetchRequest, headers: { [header: string]: string }): { [header: string]: string }
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

export type FetchRequestBody = FormData | URLSearchParams

export type FetchRequestHeaders = { [header: string]: string }

export interface FetchRequestOptions {
  headers: FetchRequestHeaders
  body: FetchRequestBody
  followRedirects: boolean
}

export class FetchRequest {
  readonly delegate: FetchRequestDelegate
  readonly method: FetchMethod
  readonly url: URL
  readonly body?: FetchRequestBody
  readonly abortController = new AbortController

  constructor(delegate: FetchRequestDelegate, method: FetchMethod, location: URL, body: FetchRequestBody = new URLSearchParams) {
    this.delegate = delegate
    this.method = method
    if (this.isIdempotent) {
      this.url = mergeFormDataEntries(location, [ ...body.entries() ])
    } else {
      this.body = body
      this.url = location
    }
  }

  get location(): URL {
    return this.url
  }

  get params(): URLSearchParams {
    return this.url.searchParams
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
      const response = await fetch(this.url.href, fetchOptions)
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
      body: this.body,
      signal: this.abortSignal
    }
  }

  get isIdempotent() {
    return this.method == FetchMethod.get
  }

  get headers() {
    const defaultHeaders = { "Accept": "text/html, application/xhtml+xml" }
    const additionalHeaders = this.additionalHeadersWithDefaults(defaultHeaders)

    return { ...defaultHeaders, ...additionalHeaders }
  }

  additionalHeadersWithDefaults(defaults: { [header: string]: string }) {
    if (typeof this.delegate.additionalHeadersForRequest == "function") {
      return this.delegate.additionalHeadersForRequest(this, { ...defaults })
    } else {
      return {}
    }
  }

  get abortSignal() {
    return this.abortController.signal
  }
}

function mergeFormDataEntries(url: URL, entries: [string, FormDataEntryValue][]): URL {
  for (const [ name, value ] of entries) {
    url.searchParams.append(name, value.toString())
  }

  return url
}
