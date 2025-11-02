import { FetchRequest, FetchMethod, fetchMethodFromString, fetchEnctypeFromString, isSafe } from "../../http/fetch_request"
import { expandURL } from "../url"
import { clearBusyState, dispatch, getAttribute, getMetaContent, hasAttribute, markAsBusy } from "../../util"
import { StreamMessage } from "../streams/stream_message"
import { prefetchCache } from "./prefetch_cache"
import { config } from "../config"

export const FormSubmissionState = {
  initialized: "initialized",
  requesting: "requesting",
  waiting: "waiting",
  receiving: "receiving",
  stopping: "stopping",
  stopped: "stopped"
}

export const FormEnctype = {
  urlEncoded: "application/x-www-form-urlencoded",
  multipart: "multipart/form-data",
  plain: "text/plain"
}

export class FormSubmission {
  state = FormSubmissionState.initialized

  static confirmMethod(message) {
    return Promise.resolve(confirm(message))
  }

  constructor(delegate, formElement, submitter, mustRedirect = false) {
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

  get method() {
    return this.fetchRequest.method
  }

  set method(value) {
    this.fetchRequest.method = value
  }

  get action() {
    return this.fetchRequest.url.toString()
  }

  set action(value) {
    this.fetchRequest.url = expandURL(value)
  }

  get body() {
    return this.fetchRequest.body
  }

  get enctype() {
    return this.fetchRequest.enctype
  }

  get isSafe() {
    return this.fetchRequest.isSafe
  }

  get location() {
    return this.fetchRequest.url
  }

  // The submission process

  async start() {
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

  stop() {
    const { stopping, stopped } = FormSubmissionState
    if (this.state != stopping && this.state != stopped) {
      this.state = stopping
      this.fetchRequest.cancel()
      return true
    }
  }

  // Fetch request delegate

  prepareRequest(fetchRequest) {
    if (!fetchRequest.isSafe) {
      const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token")
      if (token) {
        fetchRequest.headers.set("X-CSRF-Token", token)
      }
    }

    if (this.requestAcceptsTurboStreamResponse(fetchRequest)) {
      fetchRequest.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted(fetchRequest) {
    this.state = FormSubmissionState.waiting
    if (this.submitter) config.forms.submitter.beforeSubmit(this.submitter)
    this.setSubmitsWith()
    markAsBusy(this.formElement)
    dispatch("turbo:submit-start", {
      target: this.formElement,
      detail: {
        formSubmission: {
          get: () => {
            console.warn("`event.detail.formSubmission` is deprecated. Use `event.target`, `event.detail.submitter`, and `event.detail.request` instead")

            return this
          }
        },
        request: fetchRequest.request,
        submitter: this.submitter
      }
    })
    this.delegate.formSubmissionStarted(this)
  }

  requestPreventedHandlingResponse(fetchRequest, fetchResponse) {
    prefetchCache.clear()

    this.result = { success: fetchResponse.succeeded, fetchResponse: fetchResponse }
  }

  requestSucceededWithResponse(fetchRequest, fetchResponse) {
    if (fetchResponse.clientError || fetchResponse.serverError) {
      this.delegate.formSubmissionFailedWithResponse(this, fetchResponse)
      return
    }

    prefetchCache.clear()

    if (this.requestMustRedirect(fetchRequest) && responseSucceededWithoutRedirect(fetchResponse)) {
      const error = new Error("Form responses must redirect to another location")
      this.delegate.formSubmissionErrored(this, error)
    } else {
      this.state = FormSubmissionState.receiving
      this.result = {
        success: true,
        response: fetchResponse.response,

        get fetchResponse() {
          console.warn("`event.detail.fetchResponse` is deprecated. Use `event.detail.response` instead")

          return fetchResponse
        }
      }
      this.delegate.formSubmissionSucceededWithResponse(this, fetchResponse)
    }
  }

  requestFailedWithResponse(fetchRequest, fetchResponse) {
    this.result = {
      success: false,
      response: fetchResponse.response,

      get fetchResponse() {
        console.warn("`event.detail.fetchResponse` is deprecated. Use `event.detail.response` instead")

        return fetchResponse
      }
    }
    this.delegate.formSubmissionFailedWithResponse(this, fetchResponse)
  }

  requestErrored(fetchRequest, error) {
    this.result = { success: false, error }
    this.delegate.formSubmissionErrored(this, error)
  }

  requestFinished(fetchRequest) {
    const { formSubmission } = this

    this.state = FormSubmissionState.stopped
    if (this.submitter) config.forms.submitter.afterSubmit(this.submitter)
    this.resetSubmitterText()
    clearBusyState(this.formElement)

    dispatch("turbo:submit-end", {
      target: this.formElement,
      detail: {
        request: fetchRequest.request,
        submitter: this.submitter,

        get formSubmission() {
          console.warn("`event.detail.formSubmission` is deprecated. Use `event.target`, `event.detail.submitter`, and `event.detail.request` instead")

          return formSubmission
        },

        ...this.result
      }
    })
    this.delegate.formSubmissionFinished(this)
  }

  // Private

  setSubmitsWith() {
    if (!this.submitter || !this.submitsWith) return

    if (this.submitter.matches("button")) {
      this.originalSubmitText = this.submitter.innerHTML
      this.submitter.innerHTML = this.submitsWith
    } else if (this.submitter.matches("input")) {
      const input = this.submitter
      this.originalSubmitText = input.value
      input.value = this.submitsWith
    }
  }

  resetSubmitterText() {
    if (!this.submitter || !this.originalSubmitText) return

    if (this.submitter.matches("button")) {
      this.submitter.innerHTML = this.originalSubmitText
    } else if (this.submitter.matches("input")) {
      const input = this.submitter
      input.value = this.originalSubmitText
    }
  }

  requestMustRedirect(fetchRequest) {
    return !fetchRequest.isSafe && this.mustRedirect
  }

  requestAcceptsTurboStreamResponse(fetchRequest) {
    return !fetchRequest.isSafe || hasAttribute("data-turbo-stream", this.submitter, this.formElement)
  }

  get submitsWith() {
    return this.submitter?.getAttribute("data-turbo-submits-with")
  }
}

function buildFormData(formElement, submitter) {
  const formData = new FormData(formElement)
  const name = submitter?.getAttribute("name")
  const value = submitter?.getAttribute("value")

  if (name) {
    formData.append(name, value || "")
  }

  return formData
}

function getCookieValue(cookieName) {
  if (cookieName != null) {
    const cookies = document.cookie ? document.cookie.split("; ") : []
    const cookie = cookies.find((cookie) => cookie.startsWith(cookieName))
    if (cookie) {
      const value = cookie.split("=").slice(1).join("=")
      return value ? decodeURIComponent(value) : undefined
    }
  }
}

function responseSucceededWithoutRedirect(fetchResponse) {
  return fetchResponse.statusCode == 200 && !fetchResponse.redirected
}

function getFormAction(formElement, submitter) {
  const formElementAction = typeof formElement.action === "string" ? formElement.action : null

  if (submitter?.hasAttribute("formaction")) {
    return submitter.getAttribute("formaction") || ""
  } else {
    return formElement.getAttribute("action") || formElementAction || ""
  }
}

function getAction(formAction, fetchMethod) {
  const action = expandURL(formAction)

  if (isSafe(fetchMethod)) {
    action.search = ""
  }

  return action
}

function getMethod(formElement, submitter) {
  const method = submitter?.getAttribute("formmethod") || formElement.getAttribute("method") || ""
  return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get
}

function getEnctype(formElement, submitter) {
  return fetchEnctypeFromString(submitter?.getAttribute("formenctype") || formElement.enctype)
}
