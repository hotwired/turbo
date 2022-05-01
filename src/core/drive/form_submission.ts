import { FetchRequest, FetchMethod, fetchMethodFromString, FetchRequestHeaders } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { expandURL } from "../url"
import { dispatch } from "../../util"
import { StreamMessage } from "../streams/stream_message"

export interface FormSubmissionDelegate {
  formSubmissionStarted(formSubmission: FormSubmission): void
  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionErrored(formSubmission: FormSubmission, error: Error): void
  formSubmissionFinished(formSubmission: FormSubmission): void
}

export type FormSubmissionResult = { success: boolean; fetchResponse: FetchResponse } | { success: false; error: Error }

export enum FormSubmissionState {
  initialized,
  requesting,
  waiting,
  receiving,
  stopping,
  stopped,
}

enum FormEnctype {
  urlEncoded = "application/x-www-form-urlencoded",
  multipart = "multipart/form-data",
  plain = "text/plain",
}

function formEnctypeFromString(encoding: string): FormEnctype {
  switch (encoding.toLowerCase()) {
    case FormEnctype.multipart:
      return FormEnctype.multipart
    case FormEnctype.plain:
      return FormEnctype.plain
    default:
      return FormEnctype.urlEncoded
  }
}

export class FormSubmission {
  readonly delegate: FormSubmissionDelegate
  readonly formElement: HTMLFormElement
  readonly submitter?: HTMLElement
  readonly formData: FormData
  readonly location: URL
  readonly fetchRequest: FetchRequest
  readonly mustRedirect: boolean
  state = FormSubmissionState.initialized
  result?: FormSubmissionResult

  static confirmMethod(message: string, _element: HTMLFormElement): Promise<boolean> {
    return Promise.resolve(confirm(message))
  }

  constructor(
    delegate: FormSubmissionDelegate,
    formElement: HTMLFormElement,
    submitter?: HTMLElement,
    mustRedirect = false
  ) {
    this.delegate = delegate
    this.formElement = formElement
    this.submitter = submitter
    this.formData = buildFormData(formElement, submitter)
    this.location = expandURL(this.action)
    if (this.method == FetchMethod.get) {
      mergeFormDataEntries(this.location, [...this.body.entries()])
    }
    this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body, this.formElement)
    this.mustRedirect = mustRedirect
  }

  get method(): FetchMethod {
    const method = this.submitter?.getAttribute("formmethod") || this.formElement.getAttribute("method") || ""
    return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get
  }

  get action(): string {
    const formElementAction = typeof this.formElement.action === "string" ? this.formElement.action : null
    return (
      this.submitter?.getAttribute("formaction") || this.formElement.getAttribute("action") || formElementAction || ""
    )
  }

  get body() {
    if (this.enctype == FormEnctype.urlEncoded || this.method == FetchMethod.get) {
      return new URLSearchParams(this.stringFormData)
    } else {
      return this.formData
    }
  }

  get enctype(): FormEnctype {
    return formEnctypeFromString(this.submitter?.getAttribute("formenctype") || this.formElement.enctype)
  }

  get isIdempotent() {
    return this.fetchRequest.isIdempotent
  }

  get stringFormData() {
    return [...this.formData].reduce((entries, [name, value]) => {
      return entries.concat(typeof value == "string" ? [[name, value]] : [])
    }, [] as [string, string][])
  }

  get confirmationMessage() {
    return this.submitter?.getAttribute("data-turbo-confirm") || this.formElement.getAttribute("data-turbo-confirm")
  }

  get needsConfirmation() {
    return this.confirmationMessage !== null
  }

  // The submission process

  async start() {
    const { initialized, requesting } = FormSubmissionState

    if (this.needsConfirmation) {
      const answer = await FormSubmission.confirmMethod(this.confirmationMessage!, this.formElement)
      if (!answer) {
        return
      }
    }

    if (this.state == initialized) {
      this.state = requesting
      return this.fetchRequest.perform()
    }
  }

  stop() {
    const { stopping, stopped } = FormSubmissionState
    if (this.state != stopping && this.state != stopped) {
      this.state = stopping
      this.fetchRequest.cancel()
      return true
    }
  }

  // Fetch request delegate

  prepareHeadersForRequest(headers: FetchRequestHeaders, request: FetchRequest) {
    if (!request.isIdempotent) {
      const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token")
      if (token) {
        headers["X-CSRF-Token"] = token
      }
      headers["Accept"] = [StreamMessage.contentType, headers["Accept"]].join(", ")
    }
  }

  requestStarted(_request: FetchRequest) {
    this.state = FormSubmissionState.waiting
    this.submitter?.setAttribute("disabled", "")
    dispatch("turbo:submit-start", {
      target: this.formElement,
      detail: { formSubmission: this },
    })
    this.delegate.formSubmissionStarted(this)
  }

  requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse) {
    this.result = { success: response.succeeded, fetchResponse: response }
  }

  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {
    if (response.clientError || response.serverError) {
      this.delegate.formSubmissionFailedWithResponse(this, response)
    } else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
      const error = new Error("Form responses must redirect to another location")
      this.delegate.formSubmissionErrored(this, error)
    } else {
      this.state = FormSubmissionState.receiving
      this.result = { success: true, fetchResponse: response }
      this.delegate.formSubmissionSucceededWithResponse(this, response)
    }
  }

  requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    this.result = { success: false, fetchResponse: response }
    this.delegate.formSubmissionFailedWithResponse(this, response)
  }

  requestErrored(request: FetchRequest, error: Error) {
    this.result = { success: false, error }
    this.delegate.formSubmissionErrored(this, error)
  }

  requestFinished(_request: FetchRequest) {
    this.state = FormSubmissionState.stopped
    this.submitter?.removeAttribute("disabled")
    dispatch("turbo:submit-end", {
      target: this.formElement,
      detail: { formSubmission: this, ...this.result },
    })
    this.delegate.formSubmissionFinished(this)
  }

  requestMustRedirect(request: FetchRequest) {
    return !request.isIdempotent && this.mustRedirect
  }
}

function buildFormData(formElement: HTMLFormElement, submitter?: HTMLElement): FormData {
  const formData = new FormData(formElement)
  const name = submitter?.getAttribute("name")
  const value = submitter?.getAttribute("value")

  if (name && value != null && formData.get(name) != value) {
    formData.append(name, value)
  }

  return formData
}

function getCookieValue(cookieName: string | null) {
  if (cookieName != null) {
    const cookies = document.cookie ? document.cookie.split("; ") : []
    const cookie = cookies.find((cookie) => cookie.startsWith(cookieName))
    if (cookie) {
      const value = cookie.split("=").slice(1).join("=")
      return value ? decodeURIComponent(value) : undefined
    }
  }
}

function getMetaContent(name: string) {
  const element: HTMLMetaElement | null = document.querySelector(`meta[name="${name}"]`)
  return element && element.content
}

function responseSucceededWithoutRedirect(response: FetchResponse) {
  return response.statusCode == 200 && !response.redirected
}

function mergeFormDataEntries(url: URL, entries: [string, FormDataEntryValue][]): URL {
  const searchParams = new URLSearchParams()

  for (const [name, value] of entries) {
    if (value instanceof File) continue

    searchParams.append(name, value)
  }

  url.search = searchParams.toString()

  return url
}
