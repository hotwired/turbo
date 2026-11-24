import { FetchResponse } from "./fetch_response"
import { expandURL } from "../core/url"
import { dispatch } from "../util"
import { fetch } from "./fetch"
import type { FrameElement } from "../elements/frame_element"

export type FetchMethodName = "get" | "post" | "put" | "patch" | "delete"

export type FetchEnctypeName = "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain"

export type FetchRequestBody = FormData | URLSearchParams

export type FetchRequestHeaders = { [header: string]: string }

export type FetchRequestTarget = HTMLFormElement | HTMLAnchorElement | FrameElement | Element | null

export type TurboBeforeFetchRequestEvent = CustomEvent<{
  fetchOptions: FetchRequestOptions
  url: URL
  resume: (value?: unknown) => void
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

  prepareRequest(request: FetchRequest): void
  requestStarted(request: FetchRequest): void
  requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse): unknown
  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse): unknown
  requestFailedWithResponse(request: FetchRequest, response: FetchResponse): unknown
  requestErrored(request: FetchRequest, error: Error): void
  requestFinished(request: FetchRequest): void
}

export interface FetchRequestOptions extends RequestInit {
  method: string
  headers: FetchRequestHeaders
  body: FetchRequestBody | null
}

export function fetchMethodFromString(method: string): FetchMethodName | undefined {
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

export const FetchMethod = {
  get: "get",
  post: "post",
  put: "put",
  patch: "patch",
  delete: "delete"
} as const

export function fetchEnctypeFromString(encoding: string): FetchEnctypeName {
  switch (encoding.toLowerCase()) {
    case FetchEnctype.multipart:
      return FetchEnctype.multipart
    case FetchEnctype.plain:
      return FetchEnctype.plain
    default:
      return FetchEnctype.urlEncoded
  }
}

export const FetchEnctype = {
  urlEncoded: "application/x-www-form-urlencoded",
  multipart: "multipart/form-data",
  plain: "text/plain"
} as const

export class FetchRequest {
  abortController = new AbortController()
  #resolveRequestPromise = (_value?: unknown) => {}
  #adoptedRequest: FetchRequest | null = null

  declare readonly delegate: FetchRequestDelegate
  declare url: URL
  declare readonly target: FetchRequestTarget
  declare fetchOptions: FetchRequestOptions
  declare enctype: FetchEnctypeName
  declare response?: Promise<Response>

  constructor(
    delegate: FetchRequestDelegate,
    method: string,
    location: URL | string,
    requestBody: FetchRequestBody = new URLSearchParams(),
    target: FetchRequestTarget = null,
    enctype: FetchEnctypeName = FetchEnctype.urlEncoded
  ) {
    const [url, body] = buildResourceAndBody(expandURL(location), method, requestBody, enctype)

    this.delegate = delegate
    this.url = url
    this.target = target
    this.fetchOptions = {
      credentials: "same-origin",
      redirect: "follow",
      method: method.toUpperCase(),
      headers: { ...this.defaultHeaders },
      body: body,
      signal: this.abortSignal,
      referrer: this.delegate.referrer?.href
    }
    this.enctype = enctype
  }

  get method(): string {
    return this.fetchOptions.method
  }

  set method(value: string) {
    const fetchBody = this.isSafe ? this.url.searchParams : this.fetchOptions.body || new FormData()
    const fetchMethod = fetchMethodFromString(value) || FetchMethod.get

    this.url.search = ""

    const [url, body] = buildResourceAndBody(this.url, fetchMethod, fetchBody, this.enctype)

    this.url = url
    this.fetchOptions.body = body
    this.fetchOptions.method = fetchMethod.toUpperCase()
  }

  get headers(): FetchRequestHeaders {
    return this.fetchOptions.headers
  }

  set headers(value: FetchRequestHeaders) {
    this.fetchOptions.headers = value
  }

  get body(): FetchRequestBody | null {
    if (this.isSafe) {
      return this.url.searchParams
    } else {
      return this.fetchOptions.body
    }
  }

  set body(value: FetchRequestBody | null) {
    this.fetchOptions.body = value
  }

  get location(): URL {
    return this.url
  }

  get params(): URLSearchParams {
    return this.url.searchParams
  }

  get entries(): [string, FormDataEntryValue][] {
    return this.body ? Array.from(this.body.entries()) : []
  }

  cancel(): void {
    this.abortController.abort()
    this.#adoptedRequest?.cancel()
  }

  async perform(): Promise<FetchResponse | undefined> {
    const { fetchOptions } = this
    this.delegate.prepareRequest(this)
    const event = await this.#allowRequestToBeIntercepted(fetchOptions)
    try {
      this.delegate.requestStarted(this)

      if (event.detail.fetchRequest) {
        this.#adoptedRequest = event.detail.fetchRequest
        if (this.abortSignal.aborted) this.#adoptedRequest.cancel()
        this.response = this.#adoptedRequest.response

      } else {
        this.response = fetch(this.url.href, fetchOptions)
      }

      const response = (await this.response)!
      if (this.#adoptedRequest && this.abortSignal.aborted) return
      return await this.receive(response)
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        if (this.#willDelegateErrorHandling(error as Error)) {
          this.delegate.requestErrored(this, error as Error)
        }
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
      target: this.target
    })
    let responseHandling: unknown
    if (event.defaultPrevented) {
      responseHandling = this.delegate.requestPreventedHandlingResponse(this, fetchResponse)
    } else if (fetchResponse.succeeded) {
      responseHandling = this.delegate.requestSucceededWithResponse(this, fetchResponse)
    } else {
      responseHandling = this.delegate.requestFailedWithResponse(this, fetchResponse)
    }
    Promise.resolve(responseHandling).catch((error) => {
      if (error?.name !== "AbortError") throw error
    })
    return fetchResponse
  }

  get defaultHeaders(): FetchRequestHeaders {
    return {
      Accept: "text/html, application/xhtml+xml"
    }
  }

  get isSafe(): boolean {
    return isSafe(this.method)
  }

  get abortSignal(): AbortSignal {
    return this.abortController.signal
  }

  acceptResponseType(mimeType: string): void {
    this.headers["Accept"] = [mimeType, this.headers["Accept"]].join(", ")
  }

  async #allowRequestToBeIntercepted(fetchOptions: FetchRequestOptions) {
    const requestInterception = new Promise((resolve) => (this.#resolveRequestPromise = resolve))
    // `fetchRequest` is an undocumented hook: a listener may hand over a request to adopt.
    const event = dispatch<CustomEvent<TurboBeforeFetchRequestEvent["detail"] & { fetchRequest?: FetchRequest }>>("turbo:before-fetch-request", {
      cancelable: true,
      detail: {
        fetchOptions,
        url: this.url,
        resume: this.#resolveRequestPromise
      },
      target: this.target
    })
    this.url = event.detail.url
    if (event.defaultPrevented) await requestInterception

    return event
  }

  #willDelegateErrorHandling(error: Error) {
    const event = dispatch<TurboFetchRequestErrorEvent>("turbo:fetch-request-error", {
      target: this.target,
      cancelable: true,
      detail: { request: this, error: error }
    })

    return !event.defaultPrevented
  }
}

export function isSafe(fetchMethod: string): boolean {
  return fetchMethodFromString(fetchMethod) == FetchMethod.get
}

function buildResourceAndBody(
  resource: URL,
  method: string,
  requestBody: FetchRequestBody,
  enctype: FetchEnctypeName
): [URL, FetchRequestBody | null] {
  const searchParams =
    Array.from(requestBody).length > 0
      ? new URLSearchParams(entriesExcludingFiles(requestBody))
      : new URLSearchParams(resource.searchParams)

  if (isSafe(method)) {
    return [mergeIntoURLSearchParams(resource, searchParams), null]
  } else if (enctype == FetchEnctype.urlEncoded) {
    return [resource, searchParams]
  } else {
    return [resource, requestBody]
  }
}

function entriesExcludingFiles(requestBody: Iterable<[string, FormDataEntryValue]>): [string, string][] {
  const entries: [string, string][] = []

  for (const [name, value] of requestBody) {
    if (value instanceof File) continue
    else entries.push([name, value])
  }

  return entries
}

function mergeIntoURLSearchParams(url: URL, requestBody: URLSearchParams): URL {
  const searchParams = new URLSearchParams(entriesExcludingFiles(requestBody))

  url.search = searchParams.toString()

  return url
}
