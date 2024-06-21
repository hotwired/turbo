import { expandURL } from "../url"
import { clearBusyState, getVisitAction, markAsBusy } from "../../util"
import { FetchMethod, FetchRequest } from "../../http/fetch_request"
import { FormSubmission } from "../drive/form_submission"
import { PageSnapshot } from "../drive/page_snapshot"
import { StreamMessage } from "../streams/stream_message"

export class FrameVisit {
  isFormSubmission = false
  #resolveVisitPromise = () => {}

  static optionsForClick(element, url) {
    const action = getVisitAction(element)
    const acceptsStreamResponse = element.hasAttribute("data-turbo-stream")

    return { acceptsStreamResponse, action, url }
  }

  static optionsForSubmit(form, submitter) {
    const action = getVisitAction(form, submitter)

    return { action, submit: { form, submitter } }
  }

  constructor(delegate, frameElement, options) {
    this.delegate = delegate
    this.frameElement = frameElement
    this.previousURL = this.frameElement.src

    const { acceptsStreamResponse, action, url, submit } = (this.options = options)

    this.acceptsStreamResponse = acceptsStreamResponse || false
    this.action = action || getVisitAction(this.frameElement)

    if (submit) {
      const { fetchRequest } = (this.formSubmission = new FormSubmission(this, submit.form, submit.submitter))
      this.prepareRequest(fetchRequest)
      this.isFormSubmission = true
      this.isSafe = this.formSubmission.isSafe
    } else if (url) {
      this.fetchRequest = new FetchRequest(this, FetchMethod.get, expandURL(url), new URLSearchParams(), this.frameElement)
      this.isSafe = true
    } else {
      throw new Error("FrameVisit must be constructed with either a url: or submit: option")
    }
  }

  async start() {
    if (this.delegate.shouldVisitFrame(this)) {
      if (this.action) {
        this.snapshot = PageSnapshot.fromElement(this.frameElement).clone()
      }

      if (this.formSubmission) {
        await this.formSubmission.start()
      } else {
        await this.#performRequest()
      }

      return this.frameElement.loaded
    } else {
      return Promise.resolve()
    }
  }

  stop() {
    this.fetchRequest?.cancel()
    this.formSubmission?.stop()
  }

  // Fetch request delegate

  prepareRequest(fetchRequest) {
    fetchRequest.headers["Turbo-Frame"] = this.frameElement.id

    if (this.acceptsStreamResponse || this.isFormSubmission) {
      fetchRequest.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted(fetchRequest) {
    this.delegate.frameVisitStarted(this)

    if (fetchRequest.target instanceof HTMLFormElement) {
      markAsBusy(fetchRequest.target)
    }

    markAsBusy(this.frameElement)
  }

  requestPreventedHandlingResponse(_fetchRequest, _fetchResponse) {
    this.#resolveVisitPromise()
  }

  requestFinished(fetchRequest) {
    clearBusyState(this.frameElement)

    if (fetchRequest.target instanceof HTMLFormElement) {
      clearBusyState(fetchRequest.target)
    }

    this.delegate.frameVisitCompleted(this)
  }

  async requestSucceededWithResponse(_fetchRequest, fetchResponse) {
    await this.delegate.frameVisitSucceededWithResponse(this, fetchResponse)
    this.#resolveVisitPromise()
  }

  async requestFailedWithResponse(_fetchRequest, fetchResponse) {
    console.error(fetchResponse)
    await this.delegate.frameVisitFailedWithResponse(this, fetchResponse)
    this.#resolveVisitPromise()
  }

  requestErrored(fetchRequest, error) {
    this.delegate.frameVisitErrored(this, fetchRequest, error)
    this.#resolveVisitPromise()
  }

  // Form submission delegate

  formSubmissionStarted(formSubmission) {
    this.requestStarted(formSubmission.fetchRequest)
  }

  async formSubmissionSucceededWithResponse(formSubmission, fetchResponse) {
    await this.requestSucceededWithResponse(formSubmission.fetchRequest, fetchResponse)
  }

  async formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
    await this.requestFailedWithResponse(formSubmission.fetchRequest, fetchResponse)
  }

  formSubmissionErrored(formSubmission, error) {
    this.requestErrored(formSubmission.fetchRequest, error)
  }

  formSubmissionFinished(formSubmission) {
    this.requestFinished(formSubmission.fetchRequest)
  }

  #performRequest() {
    this.frameElement.loaded = new Promise((resolve) => {
      this.#resolveVisitPromise = () => {
        this.#resolveVisitPromise = () => {}
        resolve()
      }
      this.fetchRequest?.perform()
    })
  }
}
