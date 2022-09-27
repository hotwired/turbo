import {
  FrameElement,
  FrameElementDelegate,
  FrameLoadingStyle,
  FrameElementObservedAttribute,
} from "../../elements/frame_element"
import { FetchMethod, FetchRequest, FetchRequestDelegate, FetchRequestHeaders } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { AppearanceObserver, AppearanceObserverDelegate } from "../../observers/appearance_observer"
import {
  clearBusyState,
  dispatch,
  getAttribute,
  parseHTMLDocument,
  markAsBusy,
  uuid,
  getHistoryMethodForAction,
  getVisitAction,
} from "../../util"
import { FormSubmission, FormSubmissionDelegate } from "../drive/form_submission"
import { Snapshot } from "../snapshot"
import { ViewDelegate, ViewRenderOptions } from "../view"
import { Locatable, getAction, expandURL, urlsAreEqual, locationIsVisitable } from "../url"
import { FormSubmitObserver, FormSubmitObserverDelegate } from "../../observers/form_submit_observer"
import { FrameView } from "./frame_view"
import { LinkClickObserver, LinkClickObserverDelegate } from "../../observers/link_click_observer"
import { FormLinkClickObserver, FormLinkClickObserverDelegate } from "../../observers/form_link_click_observer"
import { FrameRenderer } from "./frame_renderer"
import { TurboClickEvent, session } from "../index"
import { isAction, Action } from "../types"
import { VisitOptions } from "../drive/visit"
import { TurboBeforeFrameRenderEvent } from "../session"
import { StreamMessage } from "../streams/stream_message"

type VisitFallback = (location: Response | Locatable, options: Partial<VisitOptions>) => Promise<void>
export type TurboFrameMissingEvent = CustomEvent<{ response: Response; visit: VisitFallback }>

export class FrameController
  implements
    AppearanceObserverDelegate,
    FetchRequestDelegate,
    FormSubmitObserverDelegate,
    FormSubmissionDelegate,
    FrameElementDelegate,
    FormLinkClickObserverDelegate,
    LinkClickObserverDelegate,
    ViewDelegate<FrameElement, Snapshot<FrameElement>>
{
  readonly element: FrameElement
  readonly view: FrameView
  readonly appearanceObserver: AppearanceObserver
  readonly formLinkClickObserver: FormLinkClickObserver
  readonly linkClickObserver: LinkClickObserver
  readonly formSubmitObserver: FormSubmitObserver
  formSubmission?: FormSubmission
  fetchResponseLoaded = (_fetchResponse: FetchResponse) => {}
  private currentFetchRequest: FetchRequest | null = null
  private resolveVisitPromise = () => {}
  private connected = false
  private hasBeenLoaded = false
  private ignoredAttributes: Set<FrameElementObservedAttribute> = new Set()
  private action: Action | null = null
  private frame?: FrameElement
  readonly restorationIdentifier: string
  private previousFrameElement?: FrameElement
  private currentNavigationElement?: Element

  constructor(element: FrameElement) {
    this.element = element
    this.view = new FrameView(this, this.element)
    this.appearanceObserver = new AppearanceObserver(this, this.element)
    this.formLinkClickObserver = new FormLinkClickObserver(this, this.element)
    this.linkClickObserver = new LinkClickObserver(this, this.element)
    this.restorationIdentifier = uuid()
    this.formSubmitObserver = new FormSubmitObserver(this, this.element)
  }

  connect() {
    if (!this.connected) {
      this.connected = true
      if (this.loadingStyle == FrameLoadingStyle.lazy) {
        this.appearanceObserver.start()
      } else {
        this.loadSourceURL()
      }
      this.formLinkClickObserver.start()
      this.linkClickObserver.start()
      this.formSubmitObserver.start()
    }
  }

  disconnect() {
    if (this.connected) {
      this.connected = false
      this.appearanceObserver.stop()
      this.formLinkClickObserver.stop()
      this.linkClickObserver.stop()
      this.formSubmitObserver.stop()
    }
  }

  disabledChanged() {
    if (this.loadingStyle == FrameLoadingStyle.eager) {
      this.loadSourceURL()
    }
  }

  sourceURLChanged() {
    if (this.isIgnoringChangesTo("src")) return

    if (this.element.isConnected) {
      this.complete = false
    }

    if (this.loadingStyle == FrameLoadingStyle.eager || this.hasBeenLoaded) {
      this.loadSourceURL()
    }
  }

  sourceURLReloaded() {
    const { src } = this.element
    this.ignoringChangesToAttribute("complete", () => {
      this.element.removeAttribute("complete")
    })
    this.element.src = null
    this.element.src = src
    return this.element.loaded
  }

  completeChanged() {
    if (this.isIgnoringChangesTo("complete")) return

    this.loadSourceURL()
  }

  loadingStyleChanged() {
    if (this.loadingStyle == FrameLoadingStyle.lazy) {
      this.appearanceObserver.start()
    } else {
      this.appearanceObserver.stop()
      this.loadSourceURL()
    }
  }

  private async loadSourceURL() {
    if (this.enabled && this.isActive && !this.complete && this.sourceURL) {
      this.element.loaded = this.visit(expandURL(this.sourceURL))
      this.appearanceObserver.stop()
      await this.element.loaded
      this.hasBeenLoaded = true
    }
  }

  async loadResponse(fetchResponse: FetchResponse) {
    if (fetchResponse.redirected || (fetchResponse.succeeded && fetchResponse.isHTML)) {
      this.sourceURL = fetchResponse.response.url
    }

    try {
      const html = await fetchResponse.responseHTML
      if (html) {
        const { body } = parseHTMLDocument(html)
        const newFrameElement = await this.extractForeignFrameElement(body)

        if (newFrameElement) {
          const snapshot = new Snapshot(newFrameElement)
          const renderer = new FrameRenderer(
            this,
            this.view.snapshot,
            snapshot,
            FrameRenderer.renderElement,
            false,
            false
          )
          if (this.view.renderPromise) await this.view.renderPromise
          this.changeHistory()

          await this.view.render(renderer)
          this.complete = true
          session.frameRendered(fetchResponse, this.element)
          session.frameLoaded(this.element)
          this.fetchResponseLoaded(fetchResponse)
        } else if (this.willHandleFrameMissingFromResponse(fetchResponse)) {
          console.warn(
            `A matching frame for #${this.element.id} was missing from the response, transforming into full-page Visit.`
          )
          this.visitResponse(fetchResponse.response)
        }
      }
    } catch (error) {
      console.error(error)
      this.view.invalidate()
    } finally {
      this.fetchResponseLoaded = () => {}
    }
  }

  // Appearance observer delegate

  elementAppearedInViewport(_element: Element) {
    this.loadSourceURL()
  }

  // Form link click observer delegate

  willSubmitFormLinkToLocation(link: Element): boolean {
    return link.closest("turbo-frame") == this.element && this.shouldInterceptNavigation(link)
  }

  submittedFormLinkToLocation(link: Element, _location: URL, form: HTMLFormElement): void {
    const frame = this.findFrameElement(link)
    if (frame) form.setAttribute("data-turbo-frame", frame.id)
  }

  // Link click observer delegate

  willFollowLinkToLocation(element: Element, location: URL, event: MouseEvent) {
    return this.shouldInterceptNavigation(element) && this.frameAllowsVisitingLocation(element, location, event)
  }

  followedLinkToLocation(element: Element, location: URL) {
    this.navigateFrame(element, location.href)
  }

  // Form submit observer delegate

  willSubmitForm(element: HTMLFormElement, submitter?: HTMLElement) {
    return element.closest("turbo-frame") == this.element && this.shouldInterceptNavigation(element, submitter)
  }

  formSubmitted(element: HTMLFormElement, submitter?: HTMLElement) {
    if (this.formSubmission) {
      this.formSubmission.stop()
    }

    this.formSubmission = new FormSubmission(this, element, submitter)
    const { fetchRequest } = this.formSubmission
    this.prepareHeadersForRequest(fetchRequest.headers, fetchRequest)
    this.formSubmission.start()
  }

  // Fetch request delegate

  prepareHeadersForRequest(headers: FetchRequestHeaders, request: FetchRequest) {
    headers["Turbo-Frame"] = this.id

    if (this.currentNavigationElement?.hasAttribute("data-turbo-stream")) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted(_request: FetchRequest) {
    markAsBusy(this.element)
  }

  requestPreventedHandlingResponse(_request: FetchRequest, _response: FetchResponse) {
    this.resolveVisitPromise()
  }

  async requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {
    await this.loadResponse(response)
    this.resolveVisitPromise()
  }

  async requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    console.error(response)
    await this.loadResponse(response)
    this.resolveVisitPromise()
  }

  requestErrored(request: FetchRequest, error: Error) {
    console.error(error)
    this.resolveVisitPromise()
  }

  requestFinished(_request: FetchRequest) {
    clearBusyState(this.element)
  }

  // Form submission delegate

  formSubmissionStarted({ formElement }: FormSubmission) {
    markAsBusy(formElement, this.findFrameElement(formElement))
  }

  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, response: FetchResponse) {
    const frame = this.findFrameElement(formSubmission.formElement, formSubmission.submitter)

    this.proposeVisitIfNavigatedWithAction(frame, formSubmission.formElement, formSubmission.submitter)

    frame.delegate.loadResponse(response)
  }

  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {
    this.element.delegate.loadResponse(fetchResponse)
  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {
    console.error(error)
  }

  formSubmissionFinished({ formElement }: FormSubmission) {
    clearBusyState(formElement, this.findFrameElement(formElement))
  }

  // View delegate

  allowsImmediateRender({ element: newFrame }: Snapshot<FrameElement>, options: ViewRenderOptions<FrameElement>) {
    const event = dispatch<TurboBeforeFrameRenderEvent>("turbo:before-frame-render", {
      target: this.element,
      detail: { newFrame, ...options },
      cancelable: true,
    })
    const {
      defaultPrevented,
      detail: { render },
    } = event

    if (this.view.renderer && render) {
      this.view.renderer.renderElement = render
    }

    return !defaultPrevented
  }

  viewRenderedSnapshot(_snapshot: Snapshot, _isPreview: boolean) {}

  preloadOnLoadLinksForView(element: Element) {
    session.preloadOnLoadLinksForView(element)
  }

  viewInvalidated() {}

  // Frame renderer delegate
  willRenderFrame(currentElement: FrameElement, _newElement: FrameElement) {
    this.previousFrameElement = currentElement.cloneNode(true)
  }

  visitCachedSnapshot = ({ element }: Snapshot) => {
    const frame = element.querySelector("#" + this.element.id)

    if (frame && this.previousFrameElement) {
      frame.replaceChildren(...this.previousFrameElement.children)
    }

    delete this.previousFrameElement
  }

  // Private

  private async visit(url: URL) {
    const request = new FetchRequest(this, FetchMethod.get, url, new URLSearchParams(), this.element)

    this.currentFetchRequest?.cancel()
    this.currentFetchRequest = request

    return new Promise<void>((resolve) => {
      this.resolveVisitPromise = () => {
        this.resolveVisitPromise = () => {}
        this.currentFetchRequest = null
        resolve()
      }
      request.perform()
    })
  }

  private navigateFrame(element: Element, url: string, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)

    this.proposeVisitIfNavigatedWithAction(frame, element, submitter)

    this.withCurrentNavigationElement(element, () => {
      frame.src = url
    })
  }

  private proposeVisitIfNavigatedWithAction(frame: FrameElement, element: Element, submitter?: HTMLElement) {
    this.action = getVisitAction(submitter, element, frame)
    this.frame = frame

    if (isAction(this.action)) {
      const { visitCachedSnapshot } = frame.delegate

      frame.delegate.fetchResponseLoaded = (fetchResponse: FetchResponse) => {
        if (frame.src) {
          const { statusCode, redirected } = fetchResponse
          const responseHTML = frame.ownerDocument.documentElement.outerHTML
          const response = { statusCode, redirected, responseHTML }
          const options: Partial<VisitOptions> = {
            response,
            visitCachedSnapshot,
            willRender: false,
            updateHistory: false,
            restorationIdentifier: this.restorationIdentifier,
          }

          if (this.action) options.action = this.action

          session.visit(frame.src, options)
        }
      }
    }
  }

  changeHistory() {
    if (this.action && this.frame) {
      const method = getHistoryMethodForAction(this.action)
      session.history.update(method, expandURL(this.frame.src || ""), this.restorationIdentifier)
    }
  }

  private willHandleFrameMissingFromResponse(fetchResponse: FetchResponse): boolean {
    this.element.setAttribute("complete", "")

    const response = fetchResponse.response
    const visit = async (url: Locatable | Response, options: Partial<VisitOptions> = {}) => {
      if (url instanceof Response) {
        this.visitResponse(url)
      } else {
        session.visit(url, options)
      }
    }

    const event = dispatch<TurboFrameMissingEvent>("turbo:frame-missing", {
      target: this.element,
      detail: { response, visit },
      cancelable: true,
    })

    return !event.defaultPrevented
  }

  private async visitResponse(response: Response): Promise<void> {
    const wrapped = new FetchResponse(response)
    const responseHTML = await wrapped.responseHTML
    const { location, redirected, statusCode } = wrapped

    return session.visit(location, { response: { redirected, statusCode, responseHTML } })
  }

  private findFrameElement(element: Element, submitter?: HTMLElement) {
    const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target")
    return getFrameElementById(id) ?? this.element
  }

  async extractForeignFrameElement(container: ParentNode): Promise<FrameElement | null> {
    let element
    const id = CSS.escape(this.id)

    try {
      element = activateElement(container.querySelector(`turbo-frame#${id}`), this.sourceURL)
      if (element) {
        return element
      }

      element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id}]`), this.sourceURL)
      if (element) {
        await element.loaded
        return await this.extractForeignFrameElement(element)
      }
    } catch (error) {
      console.error(error)
      return new FrameElement()
    }

    return null
  }

  private formActionIsVisitable(form: HTMLFormElement, submitter?: HTMLElement) {
    const action = getAction(form, submitter)

    return locationIsVisitable(expandURL(action), this.rootLocation)
  }

  private shouldInterceptNavigation(element: Element, submitter?: HTMLElement) {
    const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target")

    if (element instanceof HTMLFormElement && !this.formActionIsVisitable(element, submitter)) {
      return false
    }

    if (!this.enabled || id == "_top") {
      return false
    }

    if (id) {
      const frameElement = getFrameElementById(id)
      if (frameElement) {
        return !frameElement.disabled
      }
    }

    if (!session.elementIsNavigatable(element)) {
      return false
    }

    if (submitter && !session.elementIsNavigatable(submitter)) {
      return false
    }

    return true
  }

  // Computed properties

  get id() {
    return this.element.id
  }

  get enabled() {
    return !this.element.disabled
  }

  get sourceURL() {
    if (this.element.src) {
      return this.element.src
    }
  }

  set sourceURL(sourceURL: string | undefined) {
    this.ignoringChangesToAttribute("src", () => {
      this.element.src = sourceURL ?? null
    })
  }

  get loadingStyle() {
    return this.element.loading
  }

  get isLoading() {
    return this.formSubmission !== undefined || this.resolveVisitPromise() !== undefined
  }

  get complete() {
    return this.element.hasAttribute("complete")
  }

  set complete(value: boolean) {
    this.ignoringChangesToAttribute("complete", () => {
      if (value) {
        this.element.setAttribute("complete", "")
      } else {
        this.element.removeAttribute("complete")
      }
    })
  }

  get isActive() {
    return this.element.isActive && this.connected
  }

  get rootLocation() {
    const meta = this.element.ownerDocument.querySelector<HTMLMetaElement>(`meta[name="turbo-root"]`)
    const root = meta?.content ?? "/"
    return expandURL(root)
  }

  private frameAllowsVisitingLocation(target: Element, { href: url }: URL, originalEvent: MouseEvent): boolean {
    const event = dispatch<TurboClickEvent>("turbo:click", {
      target,
      detail: { url, originalEvent },
      cancelable: true,
    })

    return !event.defaultPrevented
  }

  private isIgnoringChangesTo(attributeName: FrameElementObservedAttribute): boolean {
    return this.ignoredAttributes.has(attributeName)
  }

  private ignoringChangesToAttribute(attributeName: FrameElementObservedAttribute, callback: () => void) {
    this.ignoredAttributes.add(attributeName)
    callback()
    this.ignoredAttributes.delete(attributeName)
  }

  private withCurrentNavigationElement(element: Element, callback: () => void) {
    this.currentNavigationElement = element
    callback()
    delete this.currentNavigationElement
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

function activateElement(element: Element | null, currentURL?: string | null) {
  if (element) {
    const src = element.getAttribute("src")
    if (src != null && currentURL != null && urlsAreEqual(src, currentURL)) {
      throw new Error(`Matching <turbo-frame id="${element.id}"> element has a source URL which references itself`)
    }
    if (element.ownerDocument !== document) {
      element = document.importNode(element, true)
    }

    if (element instanceof FrameElement) {
      element.connectedCallback()
      element.disconnectedCallback()
      return element
    }
  }
}
