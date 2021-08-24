import { FetchResponse } from "./fetch_response"
import { dispatch } from "../util"

export interface FetchRequestDelegate {
  referrer?: URL

  prepareHeadersForRequest?(headers: FetchRequestHeaders, request: FetchRequest): void
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
  readonly headers: FetchRequestHeaders
  readonly url: URL
  readonly body?: FetchRequestBody
  readonly abortController = new AbortController
  private resolveRequestPromise = (value: any) => {}

  constructor(delegate: FetchRequestDelegate, method: FetchMethod, location: URL, body: FetchRequestBody = new URLSearchParams) {
    this.delegate = delegate
    this.method = method
    this.headers = this.defaultHeaders
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
    this.delegate.prepareHeadersForRequest?.(this.headers, this)
    await this.allowRequestToBeIntercepted(fetchOptions)
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
      signal: this.abortSignal,
      referrer: this.delegate.referrer?.href
    }
  }

  get defaultHeaders() {
    return {
      "Accept": "text/html, application/xhtml+xml"
    }
  }

  get isIdempotent() {
    return this.method == FetchMethod.get
  }

  get abortSignal() {
    return this.abortController.signal
  }

  private async allowRequestToBeIntercepted(fetchOptions: RequestInit) {
    const requestInterception = new Promise(resolve => this.resolveRequestPromise = resolve)
    const event = dispatch("turbo:before-fetch-request", { cancelable: true, detail: { fetchOptions, url: this.url.href, resume: this.resolveRequestPromise } })
    if (event.defaultPrevented) await requestInterception
  }
}

function mergeFormDataEntries(url: URL, entries: [string, FormDataEntryValue][]): URL {
  const currentSearchParams = new URLSearchParams(url.search)

  for (const [ name, value ] of entries) {
    if (value instanceof File) continue

    if (currentSearchParams.has(name)) {
      currentSearchParams.delete(name)
      url.searchParams.set(name, value)
    } else {
      url.searchParams.append(name, value)
    }
  }

  return url
}
