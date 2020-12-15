import { FetchMethod, FetchRequest, FetchRequestDelegate } from "./fetch_request"
import { FetchResponse } from "./fetch_response"
import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FormSubmission, FormSubmissionDelegate } from "./form_submission"
import { FrameElement } from "./elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"
import { Locatable, Location } from "./location"
import { nextAnimationFrame } from "./util"

export class FrameController implements FetchRequestDelegate, FormInterceptorDelegate, FormSubmissionDelegate, LinkInterceptorDelegate {
  readonly element: FrameElement
  readonly linkInterceptor: LinkInterceptor
  readonly formInterceptor: FormInterceptor
  formSubmission?: FormSubmission
  private resolveVisitPromise = () => {}

  constructor(element: FrameElement) {
    this.element = element
    this.linkInterceptor = new LinkInterceptor(this, this.element)
    this.formInterceptor = new FormInterceptor(this, this.element)
  }

  connect() {
    this.linkInterceptor.start()
    this.formInterceptor.start()
  }

  disconnect() {
    this.linkInterceptor.stop()
    this.formInterceptor.stop()
  }

  shouldInterceptLinkClick(element: Element, url: string) {
    return this.shouldInterceptNavigation(element)
  }

  linkClickIntercepted(element: Element, url: string) {
    const frame = this.findFrameElement(element)
    frame.src = url
  }

  shouldInterceptFormSubmission(element: HTMLFormElement) {
    return this.shouldInterceptNavigation(element)
  }

  formSubmissionIntercepted(element: HTMLFormElement) {
    if (this.formSubmission) {
      this.formSubmission.stop()
    }

    this.formSubmission = new FormSubmission(this, element)
    this.formSubmission.start()
  }

  async visit(url: Locatable) {
    const location = Location.wrap(url)
    const request = new FetchRequest(this, FetchMethod.get, location)

    return new Promise(resolve => {
      this.resolveVisitPromise = () => {
        this.resolveVisitPromise = () => {}
        resolve()
      }
      request.perform()
    })
  }

  additionalHeadersForRequest(request: FetchRequest) {
    return { "X-Turbo-Frame": this.id }
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

  formSubmissionStarted(formSubmission: FormSubmission) {

  }

  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, response: FetchResponse) {
    const frame = this.findFrameElement(formSubmission.formElement)
    frame.controller.loadResponse(response)
  }

  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {

  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {

  }

  formSubmissionFinished(formSubmission: FormSubmission) {

  }

  private findFrameElement(element: Element) {
    const id = element.getAttribute("data-turbo-frame")
    return getFrameElementById(id) ?? this.element
  }

  private async loadResponse(response: FetchResponse): Promise<void> {
    const fragment = fragmentFromHTML(await response.responseHTML)
    const element = await this.extractForeignFrameElement(fragment)

    if (element) {
      await nextAnimationFrame()
      this.loadFrameElement(element)
      this.scrollFrameIntoView(element)
      await nextAnimationFrame()
      this.focusFirstAutofocusableElement()
    }
  }

  private async extractForeignFrameElement(container: ParentNode): Promise<FrameElement | undefined> {
    let element
    const id = CSS.escape(this.id)

    if (element = activateElement(container.querySelector(`turbo-frame#${id}`))) {
      return element
    }

    if (element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id}]`))) {
      await element.loaded
      return await this.extractForeignFrameElement(element)
    }
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
    const id = element.getAttribute("data-turbo-frame") || this.element.getAttribute("links-target")

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

function fragmentFromHTML(html = "") {
  const foreignDocument = document.implementation.createHTMLDocument()
  return foreignDocument.createRange().createContextualFragment(html)
}

function activateElement(element: Node | null) {
  if (element && element.ownerDocument !== document) {
    element = document.importNode(element, true)
  }

  if (element instanceof FrameElement) {
    return element
  }
}
