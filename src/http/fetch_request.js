import { FetchResponse } from "./fetch_response"
import { expandURL } from "../core/url"
import { dispatch } from "../util"
import { fetch } from "./fetch"

export function fetchMethodFromString(method) {
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
}

export function fetchEnctypeFromString(encoding) {
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
}

export class FetchRequest {
  abortController = new AbortController()
  #resolveRequestPromise = (_value) => {}

  constructor(delegate, method, location, requestBody = new URLSearchParams(), target = null, enctype = FetchEnctype.urlEncoded) {
    method = fetchMethodFromString(method)

    const [url, body] = buildResourceAndBody(expandURL(location), method, requestBody, enctype)

    this.delegate = delegate
    this.target = target
    this.request = new Request(url.href, {
      credentials: "same-origin",
      redirect: "follow",
      method: method.toUpperCase(),
      headers: { ...this.defaultHeaders },
      body: body,
      signal: this.abortSignal,
      referrer: this.delegate.referrer?.href
    })
    this.enctype = enctype
  }

  get method() {
    return this.request.method.toUpperCase()
  }

  get headers() {
    return this.request.headers
  }

  get body() {
    return this.request.body
  }

  get url() {
    return expandURL(this.request.url)
  }

  get location() {
    return this.url
  }

  get params() {
    return this.url.searchParams
  }

  get entries() {
    return this.body ? Array.from(this.body.entries()) : []
  }

  get fetchOptions() {
    console.warn("`FetchRequest.fetchOptions` is deprecated. Read properties from `FetchRequest.request` instead")

    return {
      credentials: this.request.credentials,
      redirect: this.request.redirect,
      method: this.method,
      body: this.body,
      signal: this.request.signal,
      referrer: this.request.referrer,
      headers: new Proxy(this.headers, {
        get(object, property, receiver) {
          return receiver.get(property)
        },
        set(object, property, value, receiver) {
          receiver.set(property, value)
        }
      })
    }
  }

  cancel() {
    this.abortController.abort()
  }

  async perform() {
    const { fetchOptions } = this
    this.delegate.prepareRequest(this)
    const event = await this.#allowRequestToBeIntercepted(this.request.url, fetchOptions)
    try {
      this.delegate.requestStarted(this)

      if (event.detail.fetchRequest) {
        this.response = event.detail.fetchRequest.response
      } else {
        this.response = fetch(this.request)
      }

      const response = await this.response
      return await this.receive(response)
    } catch (error) {
      if (error.name !== "AbortError") {
        if (this.#willDelegateErrorHandling(error)) {
          this.delegate.requestErrored(this, error)
        }
        throw error
      }
    } finally {
      this.delegate.requestFinished(this)
    }
  }

  async receive(response) {
    const fetchResponse = new FetchResponse(response)
    const event = dispatch("turbo:before-fetch-response", {
      cancelable: true,
      detail: {
        get fetchResponse() {
          console.warn("`event.detail.fetchResponse` is deprecated. Use `event.detail.response` instead")

          return fetchResponse
        },
        request: this.request,
        response: response
      },
      target: this.target
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

  get defaultHeaders() {
    return {
      Accept: "text/html, application/xhtml+xml"
    }
  }

  get isSafe() {
    return isSafe(this.method)
  }

  get abortSignal() {
    return this.abortController.signal
  }

  acceptResponseType(mimeType) {
    this.headers.set("Accept", [mimeType, this.headers.get("Accept")].join(", "))
  }

  async #allowRequestToBeIntercepted(url, fetchOptions) {
    const requestInterception = new Promise((resolve) => (this.#resolveRequestPromise = resolve))
    const event = dispatch("turbo:before-fetch-request", {
      cancelable: true,
      detail: {
        get fetchOptions() {
          console.warn("`event.detail.fetchOptions` is deprecated. Use `event.detail.request` instead")

          return fetchOptions
        },

        get url() {
          console.warn("`event.detail.url` is deprecated. Use `event.detail.request.url` instead")

          return url
        },

        request: this.request,
        resume: this.#resolveRequestPromise
      },
      target: this.target
    })
    this.request = event.detail.request
    if (event.defaultPrevented) await requestInterception

    return event
  }

  #willDelegateErrorHandling(error) {
    const event = dispatch("turbo:fetch-request-error", {
      target: this.target,
      cancelable: true,
      detail: { request: this.request, error: error }
    })

    return !event.defaultPrevented
  }
}

export function isSafe(fetchMethod) {
  return fetchMethodFromString(fetchMethod) == FetchMethod.get
}

function buildResourceAndBody(resource, method, requestBody, enctype) {
  const searchParams =
    Array.from(requestBody).length > 0 ? new URLSearchParams(entriesExcludingFiles(requestBody)) : resource.searchParams

  if (isSafe(method)) {
    return [mergeIntoURLSearchParams(resource, searchParams), null]
  } else if (enctype == FetchEnctype.urlEncoded) {
    return [resource, searchParams]
  } else {
    return [resource, requestBody]
  }
}

function entriesExcludingFiles(requestBody) {
  const entries = []

  for (const [name, value] of requestBody) {
    if (value instanceof File) continue
    else entries.push([name, value])
  }

  return entries
}

function mergeIntoURLSearchParams(url, requestBody) {
  const searchParams = new URLSearchParams(entriesExcludingFiles(requestBody))

  url.search = searchParams.toString()

  return url
}
