import { FetchResponse } from "./fetch_response"
import { dispatch } from "../util"

export type TurboBeforeFetchRequestEvent = CustomEvent<{
  fetchOptions: RequestInit
  url: URL
  resume: (value: any) => void
}>
export type TurboBeforeFetchResponseEvent = CustomEvent<{
  fetchResponse: FetchResponse
}>
export type TurboFetchRequestErrorEvent = CustomEvent<{
  request: FetchRequest
  error: Error
}>

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
  delete,
}

export function fetchMethodFromString(method: string) {
  switch (method.toLowerCase()) {
    case "get":
      return FetchMethod.get
    case "post":
      return FetchMethod.post
    case "put":
      return FetchMethod.put
    case "patch":
      return FetchMethod.patch
    case "delete":
      return FetchMethod.delete
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
  readonly target?: Element | null
  readonly abortController = new AbortController()
  private resolveRequestPromise = (_value: any) => {}

  constructor(
    delegate: FetchRequestDelegate,
    method: FetchMethod,
    location: URL,
    body: FetchRequestBody = new URLSearchParams(),
    target: Element | null = null
  ) {
    this.delegate = delegate
    this.method = method
    this.headers = this.defaultHeaders
    this.body = body
    this.url = location
    this.target = target
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

  async perform(): Promise<FetchResponse | void> {
    const { fetchOptions } = this
    this.delegate.prepareHeadersForRequest?.(this.headers, this)
    await this.allowRequestToBeIntercepted(fetchOptions)
    try {
      this.delegate.requestStarted(this)
      const response = await fetch(this.url.href, fetchOptions)
      return await this.receive(response)
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        if (this.willDelegateErrorHandling(error as Error)) {
          this.delegate.requestErrored(this, error as Error)
        }
        throw error
      }
    } finally {
      this.delegate.requestFinished(this)
    }
  }

  async receive(response: Response): Promise<FetchResponse> {
    const fetchResponse = new FetchResponse(response)
    const event = dispatch<TurboBeforeFetchResponseEvent>("turbo:before-fetch-response", {
      cancelable: true,
      detail: { fetchResponse },
      target: this.target as EventTarget,
    })
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
      body: this.isIdempotent ? null : this.body,
      signal: this.abortSignal,
      referrer: this.delegate.referrer?.href,
    }
  }

  get defaultHeaders() {
    return {
      Accept: "text/html, application/xhtml+xml",
    }
  }

  get isIdempotent() {
    return this.method == FetchMethod.get
  }

  get abortSignal() {
    return this.abortController.signal
  }

  acceptResponseType(mimeType: string) {
    this.headers["Accept"] = [mimeType, this.headers["Accept"]].join(", ")
  }

  private async allowRequestToBeIntercepted(fetchOptions: RequestInit) {
    const requestInterception = new Promise((resolve) => (this.resolveRequestPromise = resolve))
    const event = dispatch<TurboBeforeFetchRequestEvent>("turbo:before-fetch-request", {
      cancelable: true,
      detail: {
        fetchOptions,
        url: this.url,
        resume: this.resolveRequestPromise,
      },
      target: this.target as EventTarget,
    })
    if (event.defaultPrevented) await requestInterception
  }

  private willDelegateErrorHandling(error: Error) {
    const event = dispatch<TurboFetchRequestErrorEvent>("turbo:fetch-request-error", {
      target: this.target as EventTarget,
      cancelable: true,
      detail: { request: this, error: error },
    })

    return !event.defaultPrevented
  }
}
