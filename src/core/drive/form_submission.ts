import { FetchRequest, FetchMethod, fetchMethodFromString, fetchEnctypeFromString, isSafe, type FetchRequestDelegate, type FetchEnctypeName } from "../../http/fetch_request"
import { expandURL } from "../url"
import { clearBusyState, dispatch, getAttribute, getMetaContent, hasAttribute, markAsBusy } from "../../util"
import { StreamMessage } from "../streams/stream_message"
import { prefetchCache } from "./prefetch_cache"
import { config } from "../config"
import type { FetchResponse } from "../../http/fetch_response"

export interface FormSubmissionDelegate {
  formSubmissionWillStart?(formSubmission: FormSubmission): void
  formSubmissionStarted(formSubmission: FormSubmission): void
  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionSucceededWithStreamResponse?(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionErrored(formSubmission: FormSubmission, error: Error): void
  formSubmissionFinished(formSubmission: FormSubmission): void
}

/** How a form submission ended: with a response (successful or not) or with an error. */
export type FormSubmissionOutcome =
  | { success: true; fetchResponse: FetchResponse; error?: undefined }
  | { success: false; fetchResponse: FetchResponse; error?: undefined }
  | { success: false; error: Error; fetchResponse?: undefined }

export type FormSubmissionState = (typeof FormSubmissionState)[keyof typeof FormSubmissionState]

export const FormSubmissionState = {
  initialized: "initialized",
  requesting: "requesting",
  waiting: "waiting",
  receiving: "receiving",
  stopping: "stopping",
  stopped: "stopped"
} as const

export const FormEnctype = {
  urlEncoded: "application/x-www-form-urlencoded",
  multipart: "multipart/form-data",
  plain: "text/plain"
} as const

export class FormSubmission implements FetchRequestDelegate {
  state: FormSubmissionState = FormSubmissionState.initialized

  declare readonly delegate: FormSubmissionDelegate
  declare readonly formElement: HTMLFormElement
  declare readonly submitter?: HTMLElement
  declare readonly fetchRequest: FetchRequest
  declare readonly mustRedirect: boolean
  declare result?: FormSubmissionOutcome
  declare originalSubmitText?: string

  static confirmMethod(message: string): Promise<boolean> {
    return Promise.resolve(confirm(message))
  }

  constructor(delegate: FormSubmissionDelegate, formElement: HTMLFormElement, submitter?: HTMLElement, mustRedirect = false) {
    const method = getMethod(formElement, submitter)
    const action = getAction(getFormAction(formElement, submitter), method)
    const body = buildFormData(formElement, submitter)
    const enctype = getEnctype(formElement, submitter)

    this.delegate = delegate
    this.formElement = formElement
    this.submitter = submitter
    this.fetchRequest = new FetchRequest(this, method, action, body, formElement, enctype)
    this.mustRedirect = mustRedirect
  }

  get method(): string {
    return this.fetchRequest.method
  }

  set method(value: string) {
    this.fetchRequest.method = value
  }

  get action(): string {
    return this.fetchRequest.url.toString()
  }

  set action(value: string) {
    this.fetchRequest.url = expandURL(value)
  }

  get body(): BodyInit | null {
    return this.fetchRequest.body
  }

  get enctype(): FetchEnctypeName {
    return this.fetchRequest.enctype
  }

  get isSafe(): boolean {
    return this.fetchRequest.isSafe
  }

  get location(): URL {
    return this.fetchRequest.url
  }

  // The submission process

  async start(): Promise<FetchResponse | undefined> {
    const { initialized, requesting } = FormSubmissionState
    const confirmationMessage = getAttribute("data-turbo-confirm", this.submitter, this.formElement)

    if (typeof confirmationMessage === "string") {
      const confirmMethod = typeof config.forms.confirm === "function" ?
        config.forms.confirm :
        FormSubmission.confirmMethod

      const answer = await confirmMethod(confirmationMessage, this.formElement, this.submitter)
      if (!answer) {
        return
      }
    }

    if (this.state == initialized) {
      this.state = requesting
      return this.fetchRequest.perform()
    }
  }

  stop(): true | undefined {
    const { stopping, stopped } = FormSubmissionState
    if (this.state != stopping && this.state != stopped) {
      this.state = stopping
      this.fetchRequest.cancel()
      return true
    }
  }

  // Fetch request delegate

  prepareRequest(request: FetchRequest): void {
    if (!request.isSafe) {
      const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token")
      if (token) {
        request.headers["X-CSRF-Token"] = token
      }
    }

    if (this.requestAcceptsTurboStreamResponse(request)) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted(request: FetchRequest): void {
    this.delegate.formSubmissionWillStart?.(this)
    this.state = FormSubmissionState.waiting
    if (!request.isSafe) prefetchCache.pause(request)
    if (this.submitter) config.forms.submitter.beforeSubmit(this.submitter)
    this.setSubmitsWith()
    markAsBusy(this.formElement)
    dispatch("turbo:submit-start", {
      target: this.formElement,
      detail: { formSubmission: this }
    })
    this.delegate.formSubmissionStarted(this)
  }

  requestPreventedHandlingResponse(_request: FetchRequest, response: FetchResponse): void {
    prefetchCache.clear()

    this.result = { success: response.succeeded, fetchResponse: response }

    if (response.succeeded && !this.isSafe && response.contentType?.startsWith(StreamMessage.contentType)) {
      this.delegate.formSubmissionSucceededWithStreamResponse?.(this, response)
    }
  }

  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse): void {
    if (response.clientError || response.serverError) {
      this.delegate.formSubmissionFailedWithResponse(this, response)
      return
    }

    prefetchCache.clear()

    if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
      const error = new Error("Form responses must redirect to another location")
      this.delegate.formSubmissionErrored(this, error)
    } else {
      this.state = FormSubmissionState.receiving
      this.result = { success: true, fetchResponse: response }
      this.delegate.formSubmissionSucceededWithResponse(this, response)
    }
  }

  requestFailedWithResponse(_request: FetchRequest, response: FetchResponse): void {
    this.result = { success: false, fetchResponse: response }
    this.delegate.formSubmissionFailedWithResponse(this, response)
  }

  requestErrored(_request: FetchRequest, error: Error): void {
    this.result = { success: false, error }
    this.delegate.formSubmissionErrored(this, error)
  }

  requestFinished(request: FetchRequest): void {
    this.state = FormSubmissionState.stopped
    prefetchCache.resume(request)
    if (this.submitter) config.forms.submitter.afterSubmit(this.submitter)
    this.resetSubmitterText()
    clearBusyState(this.formElement)
    dispatch("turbo:submit-end", {
      target: this.formElement,
      detail: { formSubmission: this, ...this.result }
    })
    this.delegate.formSubmissionFinished(this)
  }

  // Private

  setSubmitsWith(): void {
    if (!this.submitter || !this.submitsWith) return

    if (this.submitter.matches("button")) {
      this.originalSubmitText = this.submitter.innerHTML
      this.submitter.innerHTML = this.submitsWith
    } else if (this.submitter.matches("input")) {
      const input = this.submitter as HTMLInputElement
      this.originalSubmitText = input.value
      input.value = this.submitsWith
    }
  }

  resetSubmitterText(): void {
    if (!this.submitter || !this.originalSubmitText) return

    if (this.submitter.matches("button")) {
      this.submitter.innerHTML = this.originalSubmitText
    } else if (this.submitter.matches("input")) {
      const input = this.submitter as HTMLInputElement
      input.value = this.originalSubmitText
    }
  }

  requestMustRedirect(request: FetchRequest): boolean {
    return !request.isSafe && this.mustRedirect
  }

  requestAcceptsTurboStreamResponse(request: FetchRequest): boolean {
    return !request.isSafe || hasAttribute("data-turbo-stream", this.submitter, this.formElement)
  }

  get submitsWith(): string | null | undefined {
    return this.submitter?.getAttribute("data-turbo-submits-with")
  }
}

function buildFormData(formElement: HTMLFormElement, submitter?: HTMLElement): FormData {
  const formData = new FormData(formElement)
  const name = submitter?.getAttribute("name")
  const value = submitter?.getAttribute("value")

  if (name) {
    formData.append(name, value || "")
  }

  return formData
}

function getCookieValue(cookieName: string | null): string | undefined {
  if (cookieName != null) {
    const cookies = document.cookie ? document.cookie.split("; ") : []
    const cookie = cookies.find((cookie) => cookie.startsWith(cookieName))
    if (cookie) {
      const value = cookie.split("=").slice(1).join("=")
      return value ? decodeURIComponent(value) : undefined
    }
  }
}

function responseSucceededWithoutRedirect(response: FetchResponse): boolean {
  return response.statusCode == 200 && !response.redirected
}

function getFormAction(formElement: HTMLFormElement, submitter?: HTMLElement): string {
  const formElementAction = typeof formElement.action === "string" ? formElement.action : null

  if (submitter?.hasAttribute("formaction")) {
    return submitter.getAttribute("formaction") || ""
  } else {
    return formElement.getAttribute("action") || formElementAction || ""
  }
}

function getAction(formAction: string, fetchMethod: string): URL {
  const action = expandURL(formAction)

  if (isSafe(fetchMethod)) {
    action.search = ""
  }

  return action
}

function getMethod(formElement: HTMLFormElement, submitter?: HTMLElement): string {
  const method = submitter?.getAttribute("formmethod") || formElement.getAttribute("method") || ""
  return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get
}

function getEnctype(formElement: HTMLFormElement, submitter?: HTMLElement): FetchEnctypeName {
  return fetchEnctypeFromString(submitter?.getAttribute("formenctype") || formElement.enctype)
}
