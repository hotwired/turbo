import { FrameElement, FrameElementDelegate, FrameLoadingStyle } from "../../elements/frame_element"
import { FetchMethod, FetchRequest, FetchRequestDelegate, FetchRequestHeaders } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { AppearanceObserver, AppearanceObserverDelegate } from "../../observers/appearance_observer"
import { parseHTMLDocument } from "../../util"
import { FormSubmission, FormSubmissionDelegate } from "../drive/form_submission"
import { Snapshot } from "../snapshot"
import { ViewDelegate } from "../view"
import { expandURL, Locatable } from "../url"
import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FrameView } from "./frame_view"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"
import { FrameRenderer } from "./frame_renderer"
import { dispatch } from "../../util"
import { TimingMetric, TimingMetrics } from "../drive/visit"

export class FrameController implements AppearanceObserverDelegate, FetchRequestDelegate, FormInterceptorDelegate, FormSubmissionDelegate, FrameElementDelegate, LinkInterceptorDelegate, ViewDelegate<Snapshot<FrameElement>> {
  readonly element: FrameElement
  readonly view: FrameView
  readonly appearanceObserver: AppearanceObserver
  readonly linkInterceptor: LinkInterceptor
  readonly formInterceptor: FormInterceptor
  loadingURL?: string
  formSubmission?: FormSubmission
  private resolveVisitPromise = () => {}
  timingMetrics: TimingMetrics = {}

  constructor(element: FrameElement) {
    this.element = element
    this.view = new FrameView(this, this.element)
    this.appearanceObserver = new AppearanceObserver(this, this.element)
    this.linkInterceptor = new LinkInterceptor(this, this.element)
    this.formInterceptor = new FormInterceptor(this, this.element)
  }

  connect() {
    if (this.loadingStyle == FrameLoadingStyle.lazy) {
      this.appearanceObserver.start()
    }
    this.linkInterceptor.start()
    this.formInterceptor.start()
  }

  disconnect() {
    this.appearanceObserver.stop()
    this.linkInterceptor.stop()
    this.formInterceptor.stop()
  }

  sourceURLChanged() {
    if (this.loadingStyle == FrameLoadingStyle.eager) {
      this.loadSourceURL()
    }
  }

  loadingStyleChanged() {
    if (this.loadingStyle == FrameLoadingStyle.lazy) {
      this.appearanceObserver.start()
    } else {
      this.appearanceObserver.stop()
      this.loadSourceURL()
    }
  }

  async loadSourceURL() {
    const event = dispatch("turbo:before-frame-visit", { target: this.element, detail: { url: this.sourceURL }, cancelable: true })
    if (event.defaultPrevented) {
      return new Promise<void>(resolve => resolve())
    }

    if (this.isActive && this.sourceURL && this.sourceURL != this.loadingURL) {
      try {
        this.loadingURL = this.sourceURL
        this.element.loaded = this.visit(this.sourceURL)
        this.appearanceObserver.stop()
        await this.element.loaded
      } finally {
        delete this.loadingURL
      }
    }
  }

  async loadResponse(response: FetchResponse) {
    try {
      const html = await response.responseHTML
      if (html) {
        const { body } = parseHTMLDocument(html)
        const snapshot = new Snapshot(await this.extractForeignFrameElement(body))
        const renderer = new FrameRenderer(this.view.snapshot, snapshot, false)
        await this.view.render(renderer)
      }
    } catch (error) {
      console.error(error)
      this.view.invalidate()
    }
  }

  // Appearance observer delegate

  elementAppearedInViewport(element: Element) {
    this.loadSourceURL()
  }

  // Link interceptor delegate

  shouldInterceptLinkClick(element: Element, url: string) {
    return this.shouldInterceptNavigation(element)
  }

  linkClickIntercepted(element: Element, url: string) {
    const frame = this.findFrameElement(element)
    frame.src = url
  }

  // Form interceptor delegate

  shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement) {
    return this.shouldInterceptNavigation(element, submitter)
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    if (this.formSubmission) {
      this.formSubmission.stop()
    }

    this.formSubmission = new FormSubmission(this, element, submitter)
    if (this.formSubmission.fetchRequest.isIdempotent) {
      const frame = this.findFrameElement(element, submitter)
      frame.src = this.formSubmission.fetchRequest.url.href
    } else {
      this.formSubmission.start()
    }
  }

  // Fetch request delegate

  prepareHeadersForRequest(headers: FetchRequestHeaders, request: FetchRequest) {
    headers["Turbo-Frame"] = this.id
  }

  requestStarted(request: FetchRequest) {
    this.element.setAttribute("busy", "")
  }

  requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse) {
    this.resolveVisitPromise()
  }

  async requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {
    await this.loadResponse(response)
    this.resolveVisitPromise()
  }

  requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    console.error(response)
    this.resolveVisitPromise()
  }

  requestErrored(request: FetchRequest, error: Error) {
    console.error(error)
    this.resolveVisitPromise()
  }

  requestFinished(request: FetchRequest) {
    this.element.removeAttribute("busy")
  }

  // Form submission delegate

  formSubmissionStarted(formSubmission: FormSubmission) {

  }

  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, response: FetchResponse) {
    const frame = this.findFrameElement(formSubmission.formElement, formSubmission.submitter)
    frame.delegate.loadResponse(response)
  }

  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {
    this.element.delegate.loadResponse(fetchResponse)
  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {

  }

  formSubmissionFinished(formSubmission: FormSubmission) {

  }

  // View delegate

  viewWillRenderSnapshot(snapshot: Snapshot, isPreview: boolean) {
    dispatch("turbo:before-frame-cache", { target: this.element })
    dispatch("turbo:before-frame-render", { target: this.element, detail: { newBody: snapshot.element } })
  }

  viewRenderedSnapshot(snapshot: Snapshot, isPreview: boolean) {
    dispatch("turbo:frame-render", { target: this.element })
  }

  viewInvalidated() {

  }

  // Private

  private async visit(url: Locatable) {
    const request = new FetchRequest(this, FetchMethod.get, expandURL(url))
    return new Promise<void>(resolve => {
      this.resolveVisitPromise = () => {
        this.resolveVisitPromise = () => {}
        resolve()
      }
      this.clearTimingMetrics()
      this.recordTimingMetric(TimingMetric.visitStart)
      dispatch("turbo:frame-visit", { target: this.element, detail: { url: request.url.href } })
      request.perform()
    }).then(() => {
      this.recordTimingMetric(TimingMetric.visitEnd)
      dispatch("turbo:frame-load", { target: this.element, detail: { url: request.url.href, timing: this.timingMetrics } })
    })
  }

  private findFrameElement(element: Element, submitter?: HTMLElement) {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame") || this.element.getAttribute("target")
    return getFrameElementById(id) ?? this.element
  }

  async extractForeignFrameElement(container: ParentNode): Promise<FrameElement> {
    let element
    const id = CSS.escape(this.id)

    if (element = activateElement(container.querySelector(`turbo-frame#${id}`))) {
      return element
    }

    if (element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id}]`))) {
      await element.loaded
      return await this.extractForeignFrameElement(element)
    }

    console.error(`Response has no matching <turbo-frame id="${id}"> element`)
    return new FrameElement()
  }

  private shouldInterceptNavigation(element: Element, submitter?: HTMLElement) {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame") || this.element.getAttribute("target")

    if (!this.enabled || id == "_top") {
      return false
    }

    if (id) {
      const frameElement = getFrameElementById(id)
      if (frameElement) {
        return !frameElement.disabled
      }
    }

    return true
  }

  private clearTimingMetrics() {
    this.timingMetrics = {}
  }

  private recordTimingMetric(metric: TimingMetric) {
    this.timingMetrics[metric] = new Date().getTime()
  }

  // Computed properties

  get id() {
    return this.element.id
  }

  get enabled() {
    return !this.element.disabled
  }

  get sourceURL() {
    return this.element.src
  }

  get loadingStyle() {
    return this.element.loading
  }

  get isLoading() {
    return this.formSubmission !== undefined || this.loadingURL !== undefined
  }

  get isActive() {
    return this.element.isActive
  }
}

function getFrameElementById(id: string | null) {
  if (id != null) {
    const element = document.getElementById(id)
    if (element instanceof FrameElement) {
      return element
    }
  }
}

function activateElement(element: Node | null) {
  if (element && element.ownerDocument !== document) {
    element = document.importNode(element, true)
  }

  if (element instanceof FrameElement) {
    return element
  }
}
