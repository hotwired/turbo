import { expandURL } from "../url"
import { getAttribute } from "../../util"
import { Action } from "../types"
import { getVisitAction } from "../drive/visit"
import { FrameElement } from "../../elements/frame_element"
import { FetchRequest, FetchRequestHeaders, FetchRequestDelegate, FetchMethod } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { FormSubmission, FormSubmissionDelegate } from "../drive/form_submission"
import { StreamAction, streamActionFromString } from "../streams/stream_actions"

export interface FrameVisitOptions {
  action: Action | null,
  submit: { form: HTMLFormElement, submitter?: HTMLElement },
  url: string,
  rendering: StreamAction | null
}

export interface FrameVisitDelegate {
  shouldVisit(frameVisit: FrameVisit): boolean
  visitStarted(frameVisit: FrameVisit): void
  visitSucceeded(frameVisit: FrameVisit, response: FetchResponse): void
  visitFailed(frameVisit: FrameVisit, response: FetchResponse): void
  visitErrored(frameVisit: FrameVisit, error: Error): void
  visitCompleted(frameVisit: FrameVisit): void
}

export class FrameVisit implements FetchRequestDelegate, FormSubmissionDelegate {
  readonly delegate: FrameVisitDelegate
  readonly element: FrameElement
  readonly action: Action | null
  readonly previousURL: string | null
  readonly rendering: StreamAction
  readonly options: Partial<FrameVisitOptions>
  readonly isFormSubmission: boolean = false

  private readonly fetchRequest?: FetchRequest
  private readonly formSubmission?: FormSubmission
  private resolveVisitPromise = () => {}

  static optionsForClick(element: Element, url: string): Partial<FrameVisitOptions> {
    const action = getVisitAction(element)
    const rendering = streamActionFromString(getAttribute("data-turbo-rendering", element))

    return { action, rendering, url }
  }

  static optionsForSubmit(form: HTMLFormElement, submitter?: HTMLElement): Partial<FrameVisitOptions> {
    const action = getVisitAction(form, submitter)
    const rendering = streamActionFromString(getAttribute("data-turbo-rendering", submitter, form))

    return { action, rendering, submit: { form, submitter } }
  }

  constructor(delegate: FrameVisitDelegate, element: FrameElement, options: Partial<FrameVisitOptions> = {}) {
    this.delegate = delegate
    this.element = element
    this.previousURL = this.element.src
    const { action, rendering, url, submit } = this.options = options

    this.action = action || getVisitAction(this.element)
    this.rendering = rendering || this.element.rendering
    if (url) {
      this.fetchRequest = new FetchRequest(this, FetchMethod.get, expandURL(url), new URLSearchParams, this.element)
    } else if (submit) {
      const { fetchRequest } = this.formSubmission = new FormSubmission(this, submit.form, submit.submitter)
      this.prepareHeadersForRequest(fetchRequest.headers)
      this.isFormSubmission = true
    }
  }

  async start() {
    if (this.delegate.shouldVisit(this)) {
      if (this.formSubmission) {
        await this.formSubmission.start()
      } else {
        await this.performRequest()
      }
    }
  }

  stop() {
    this.fetchRequest?.cancel()
    this.formSubmission?.stop()
  }

  // Fetch request delegate

  prepareHeadersForRequest(headers: FetchRequestHeaders) {
    headers["Turbo-Frame"] = this.element.id
  }

  requestStarted(request: FetchRequest) {
    this.delegate.visitStarted(this)
  }

  requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse) {
    this.resolveVisitPromise()
  }

  requestFinished(request: FetchRequest) {
    this.delegate.visitCompleted(this)
  }

  async requestSucceededWithResponse(fetchRequest: FetchRequest, fetchResponse: FetchResponse) {
    await this.delegate.visitSucceeded(this, fetchResponse)
    this.resolveVisitPromise()
  }

  async requestFailedWithResponse(request: FetchRequest, fetchResponse: FetchResponse) {
    console.error(fetchResponse)
    await this.delegate.visitFailed(this, fetchResponse)
    this.resolveVisitPromise()
  }

  requestErrored(request: FetchRequest, error: Error) {
    this.delegate.visitErrored(this, error)
    this.resolveVisitPromise()
  }

  // Form submission delegate

  formSubmissionStarted({ fetchRequest }: FormSubmission) {
    this.requestStarted(fetchRequest)
  }

  async formSubmissionSucceededWithResponse({ fetchRequest }: FormSubmission, response: FetchResponse) {
    await this.requestSucceededWithResponse(fetchRequest, response)
  }

  async formSubmissionFailedWithResponse({ fetchRequest }: FormSubmission, fetchResponse: FetchResponse) {
    await this.requestFailedWithResponse(fetchRequest, fetchResponse)
  }

  formSubmissionErrored({ fetchRequest }: FormSubmission, error: Error) {
    this.requestErrored(fetchRequest, error)
  }

  formSubmissionFinished({ fetchRequest }: FormSubmission) {
    this.requestFinished(fetchRequest)
  }

  private performRequest() {
    this.element.loaded = new Promise<void>(resolve => {
      this.resolveVisitPromise = () => {
        this.resolveVisitPromise = () => {}
        resolve()
      }
      this.fetchRequest?.perform()
    })
  }
}
