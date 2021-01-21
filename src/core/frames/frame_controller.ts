import { FrameElement, FrameElementDelegate, FrameLoadingStyle } from "../../elements/frame_element"
import { FetchMethod, FetchRequest, FetchRequestDelegate } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { AppearanceObserver, AppearanceObserverDelegate } from "../../observers/appearance_observer"
import { nextAnimationFrame } from "../../util"
import { FormSubmission, FormSubmissionDelegate } from "../drive/form_submission"
import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"
import { expandURL, Locatable } from "../url"

export class FrameController implements AppearanceObserverDelegate, FetchRequestDelegate, FormInterceptorDelegate, FormSubmissionDelegate, FrameElementDelegate, LinkInterceptorDelegate {
  readonly element: FrameElement
  readonly appearanceObserver: AppearanceObserver
  readonly linkInterceptor: LinkInterceptor
  readonly formInterceptor: FormInterceptor
  loadingURL?: string
  formSubmission?: FormSubmission
  private resolveVisitPromise = () => {}

  constructor(element: FrameElement) {
    this.element = element
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

  async loadResponse(response: FetchResponse): Promise<void> {
    const fragment = fragmentFromHTML(await response.responseHTML)
    if (fragment) {
      const element = await this.extractForeignFrameElement(fragment)
      await nextAnimationFrame()
      this.loadFrameElement(element)
      this.scrollFrameIntoView(element)
      await nextAnimationFrame()
      this.focusFirstAutofocusableElement()
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
    this.navigateFrame(element, url)
  }

  // Form interceptor delegate

  shouldInterceptFormSubmission(element: HTMLFormElement) {
    return this.shouldInterceptNavigation(element)
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    if (this.formSubmission) {
      this.formSubmission.stop()
    }

    this.formSubmission = new FormSubmission(this, element, submitter)
    if (this.formSubmission.fetchRequest.isIdempotent) {
      this.navigateFrame(element, this.formSubmission.fetchRequest.url.href)
    } else {
      this.formSubmission.start()
    }
  }

  // Fetch request delegate

  additionalHeadersForRequest(request: FetchRequest) {
    return { "Turbo-Frame": this.id }
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
    const frame = this.findFrameElement(formSubmission.formElement)
    frame.delegate.loadResponse(response)
  }

  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {
    this.element.delegate.loadResponse(fetchResponse)
  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {

  }

  formSubmissionFinished(formSubmission: FormSubmission) {

  }

  // Private

  private async visit(url: Locatable) {
    const request = new FetchRequest(this, FetchMethod.get, expandURL(url))

    return new Promise<void>(resolve => {
      this.resolveVisitPromise = () => {
        this.resolveVisitPromise = () => {}
        resolve()
      }
      request.perform()
    })
  }

  private navigateFrame(element: Element, url: string) {
    const frame = this.findFrameElement(element)
    frame.src = url
  }

  private findFrameElement(element: Element) {
    const id = element.getAttribute("data-turbo-frame")
    return getFrameElementById(id) ?? this.element
  }

  private async extractForeignFrameElement(container: ParentNode): Promise<FrameElement> {
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

  private loadFrameElement(frameElement: FrameElement) {
    const destinationRange = document.createRange()
    destinationRange.selectNodeContents(this.element)
    destinationRange.deleteContents()

    const sourceRange = frameElement.ownerDocument?.createRange()
    if (sourceRange) {
      sourceRange.selectNodeContents(frameElement)
      this.element.appendChild(sourceRange.extractContents())
    }
  }

  private focusFirstAutofocusableElement(): boolean {
    const element = this.firstAutofocusableElement
    if (element) {
      element.focus()
      return true
    }
    return false
  }

  private scrollFrameIntoView(frame: FrameElement): boolean {
    if (this.element.autoscroll || frame.autoscroll) {
      const element = this.element.firstElementChild
      const block = readScrollLogicalPosition(this.element.getAttribute("data-autoscroll-block"), "end")

      if (element) {
        element.scrollIntoView({ block })
        return true
      }
    }
    return false
  }

  private shouldInterceptNavigation(element: Element) {
    const id = element.getAttribute("data-turbo-frame") || this.element.getAttribute("target")

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

  // Computed properties

  get firstAutofocusableElement(): HTMLElement | null {
    const element = this.element.querySelector("[autofocus]")
    return element instanceof HTMLElement ? element : null
  }

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

function readScrollLogicalPosition(value: string | null, defaultValue: ScrollLogicalPosition): ScrollLogicalPosition {
  if (value == "end" || value == "start" || value == "center" || value == "nearest") {
    return value
  } else {
    return defaultValue
  }
}

function fragmentFromHTML(html?: string) {
  if (html) {
    const foreignDocument = document.implementation.createHTMLDocument()
    return foreignDocument.createRange().createContextualFragment(html)
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
