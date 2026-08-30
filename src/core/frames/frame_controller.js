import { FrameElement, FrameLoadingStyle } from "../../elements/frame_element"
import { FetchMethod, FetchRequest } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { AppearanceObserver } from "../../observers/appearance_observer"
import {
  clearBusyState,
  dispatch,
  getAttribute,
  parseHTMLDocument,
  markAsBusy,
  uuid,
  getHistoryMethodForAction,
  getVisitAction
} from "../../util"
import { FormSubmission } from "../drive/form_submission"
import { Snapshot } from "../snapshot"
import { getAction, expandURL, urlsAreEqual, locationIsVisitable } from "../url"
import { FormSubmitObserver } from "../../observers/form_submit_observer"
import { FrameView } from "./frame_view"
import { LinkInterceptor } from "./link_interceptor"
import { FormLinkClickObserver } from "../../observers/form_link_click_observer"
import { FrameRenderer } from "./frame_renderer"
import { MorphingFrameRenderer } from "./morphing_frame_renderer"
import { session } from "../index"
import { StreamMessage } from "../streams/stream_message"
import { PageSnapshot } from "../drive/page_snapshot"
import { TurboFrameMissingError } from "../errors"

export class FrameController {
  fetchResponseLoaded = (_fetchResponse) => Promise.resolve()
  #currentFetchRequest = null
  #resolveVisitPromise = () => {}
  #connected = false
  #hasBeenLoaded = false
  #ignoredAttributes = new Set()
  #shouldMorphFrame = false
  #currentRequestIsMorphRefresh = false
  #pendingMorphRefresh = false
  #performingMorphRefresh = false
  action = null

  constructor(element) {
    this.element = element
    this.view = new FrameView(this, this.element)
    this.appearanceObserver = new AppearanceObserver(this, this.element)
    this.formLinkClickObserver = new FormLinkClickObserver(this, this.element)
    this.linkInterceptor = new LinkInterceptor(this, this.element)
    this.restorationIdentifier = uuid()
    this.formSubmitObserver = new FormSubmitObserver(this, this.element)
  }

  // Frame delegate

  connect() {
    if (!this.#connected) {
      this.#connected = true
      if (this.loadingStyle == FrameLoadingStyle.lazy) {
        this.appearanceObserver.start()
      } else {
        this.#loadSourceURL()
      }
      this.formLinkClickObserver.start()
      this.linkInterceptor.start()
      this.formSubmitObserver.start()
    }
  }

  disconnect() {
    if (this.#connected) {
      this.#connected = false
      this.appearanceObserver.stop()
      this.formLinkClickObserver.stop()
      this.linkInterceptor.stop()
      this.formSubmitObserver.stop()

      this.#pendingMorphRefresh = false

      if (!this.element.hasAttribute("recurse")) {
        this.#cancelFetchRequest()
      }
    }
  }

  disabledChanged() {
    if (this.disabled) {
      this.#pendingMorphRefresh = false
      this.#cancelFetchRequest()
    } else if (this.loadingStyle == FrameLoadingStyle.eager) {
      this.#loadSourceURL()
    }
  }

  sourceURLChanged() {
    if (this.#isIgnoringChangesTo("src")) return

    // An explicit src change (external navigation, or an explicit reload()'s
    // null-then-set toggle) supersedes any queued morph refresh.
    this.#pendingMorphRefresh = false

    if (!this.sourceURL) {
      this.#cancelFetchRequest()
    }

    if (this.element.isConnected) {
      this.complete = false
    }

    if (this.loadingStyle == FrameLoadingStyle.eager || this.#hasBeenLoaded) {
      this.#loadSourceURL()
    }
  }

  sourceURLReloaded() {
    const { refresh, src } = this.element

    this.#shouldMorphFrame = src && refresh === "morph"

    this.element.removeAttribute("complete")
    this.element.src = null
    this.element.src = src
    return this.element.loaded
  }

  // Refresh the frame's contents as part of a page or ancestor-frame morph.
  //
  // Unlike reload(), this does not unconditionally abort and re-issue the
  // frame's fetch. If a morph-driven refresh is already in flight, the new
  // morph is coalesced into a single queued follow-up that runs once the
  // in-flight request settles. Without this, a burst of morphs (e.g. repeated
  // refresh broadcasts) would each abort the request the previous morph
  // started, starving the fetch so its content never lands.
  refreshForMorph() {
    if (this.#currentRequestIsMorphRefresh) {
      this.#pendingMorphRefresh = true
    } else {
      this.#performMorphRefresh()
    }
  }

  // Reuse reload()'s exact refresh semantics (complete/src handling, lazy and
  // disabled gating, morph-render selection), tagging the resulting request as
  // a morph refresh so the scheduler can coalesce subsequent morphs against it.
  #performMorphRefresh() {
    this.#pendingMorphRefresh = false
    this.#performingMorphRefresh = true
    try {
      this.sourceURLReloaded()
    } finally {
      this.#performingMorphRefresh = false
    }
  }

  loadingStyleChanged() {
    if (this.loadingStyle == FrameLoadingStyle.lazy) {
      this.appearanceObserver.start()
    } else {
      this.appearanceObserver.stop()
      this.#loadSourceURL()
    }
  }

  async #loadSourceURL() {
    if (this.enabled && this.isActive && !this.complete && this.sourceURL) {
      this.element.loaded = this.#visit(expandURL(this.sourceURL))
      this.appearanceObserver.stop()
      await this.element.loaded
      this.#hasBeenLoaded = true
    }
  }

  async loadResponse(fetchResponse) {
    if (fetchResponse.redirected || (fetchResponse.succeeded && fetchResponse.isHTML)) {
      this.sourceURL = fetchResponse.response.url
    }

    try {
      const html = await fetchResponse.responseHTML
      if (html) {
        const document = parseHTMLDocument(html)
        const pageSnapshot = PageSnapshot.fromDocument(document)

        if (pageSnapshot.isVisitable) {
          await this.#loadFrameResponse(fetchResponse, document)
        } else {
          await this.#handleUnvisitableFrameResponse(fetchResponse)
        }
      }
    } finally {
      this.#shouldMorphFrame = false
      this.fetchResponseLoaded = () => Promise.resolve()
    }
  }

  // Appearance observer delegate

  elementAppearedInViewport(element) {
    this.proposeVisitIfNavigatedWithAction(element, getVisitAction(element))
    this.#loadSourceURL()
  }

  // Form link click observer delegate

  willSubmitFormLinkToLocation(link) {
    return this.#shouldInterceptNavigation(link)
  }

  submittedFormLinkToLocation(link, _location, form) {
    const frame = this.#findFrameElement(link)
    if (frame) form.setAttribute("data-turbo-frame", frame.id)
  }

  // Link interceptor delegate

  shouldInterceptLinkClick(element, _location, _event) {
    return this.#shouldInterceptNavigation(element)
  }

  linkClickIntercepted(element, location) {
    this.#navigateFrame(element, location)
  }

  // Form submit observer delegate

  willSubmitForm(element, submitter) {
    return element.closest("turbo-frame") == this.element && this.#shouldInterceptNavigation(element, submitter)
  }

  formSubmitted(element, submitter) {
    if (this.formSubmission) {
      this.formSubmission.stop()
    }

    this.formSubmission = new FormSubmission(this, element, submitter)

    const { fetchRequest } = this.formSubmission
    const frame = this.#findFrameElement(element, submitter)

    this.prepareRequest(fetchRequest, frame)
    this.formSubmission.start()
  }

  // Fetch request delegate

  prepareRequest(request, frame = this) {
    request.headers["Turbo-Frame"] = frame.id

    if (this.currentNavigationElement?.hasAttribute("data-turbo-stream")) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted(_request) {
    markAsBusy(this.element)
  }

  requestPreventedHandlingResponse(request, _response) {
    this.#finishRequest(request)
  }

  async requestSucceededWithResponse(request, response) {
    try {
      await this.loadResponse(response)
    } finally {
      this.#finishRequest(request)
    }
  }

  async requestFailedWithResponse(request, response) {
    try {
      await this.loadResponse(response)
    } finally {
      this.#finishRequest(request)
    }
  }

  requestErrored(request, error) {
    console.error(error)
    this.#finishRequest(request)
  }

  requestFinished(_request) {
    clearBusyState(this.element)
  }

  // Form submission delegate

  formSubmissionStarted({ formElement }) {
    markAsBusy(formElement, this.#findFrameElement(formElement))
  }

  formSubmissionSucceededWithResponse(formSubmission, response) {
    const frame = this.#findFrameElement(formSubmission.formElement, formSubmission.submitter)

    frame.delegate.proposeVisitIfNavigatedWithAction(frame, getVisitAction(formSubmission.submitter, formSubmission.formElement, frame))
    frame.delegate.loadResponse(response)

    if (!formSubmission.isSafe) {
      session.clearCache()
    }
  }

  formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
    this.element.delegate.loadResponse(fetchResponse)
    session.clearCache()
  }

  formSubmissionErrored(formSubmission, error) {
    console.error(error)
  }

  formSubmissionFinished({ formElement }) {
    clearBusyState(formElement, this.#findFrameElement(formElement))
  }

  // View delegate

  allowsImmediateRender({ element: newFrame }, options) {
    const event = dispatch("turbo:before-frame-render", {
      target: this.element,
      detail: { newFrame, ...options },
      cancelable: true
    })

    const {
      defaultPrevented,
      detail: { render }
    } = event

    if (this.view.renderer && render) {
      this.view.renderer.renderElement = render
    }

    return !defaultPrevented
  }

  viewRenderedSnapshot(_snapshot, _isPreview, _renderMethod) {}

  preloadOnLoadLinksForView(element) {
    session.preloadOnLoadLinksForView(element)
  }

  viewInvalidated() {}

  // Frame renderer delegate

  willRenderFrame(currentElement, _newElement) {
    // Only clone the frame for promoted frame visits, where visitCachedSnapshot
    // consumes the clone to restore the frame's contents into the cached page
    // snapshot (and deletes it). For plain frame renders — src changes without
    // a data-turbo-action, refresh="morph" reloads, broadcast-driven reloads —
    // nothing ever consumes or clears the clone, so it would pin a complete
    // copy of the frame's previous subtree on the controller indefinitely.
    if (this.action) {
      this.previousFrameElement = currentElement.cloneNode(true)
    }
  }

  visitCachedSnapshot = ({ element }) => {
    const frame = element.querySelector("#" + this.element.id)

    if (frame && this.previousFrameElement) {
      frame.replaceChildren(...this.previousFrameElement.children)
    }

    delete this.previousFrameElement
  }

  // Private

  async #loadFrameResponse(fetchResponse, document) {
    const newFrameElement = await this.extractForeignFrameElement(document.body)
    const rendererClass = this.#shouldMorphFrame ? MorphingFrameRenderer : FrameRenderer

    if (newFrameElement) {
      const snapshot = new Snapshot(newFrameElement)
      const renderer = new rendererClass(this, this.view.snapshot, snapshot, false, false)
      if (this.view.renderPromise) await this.view.renderPromise
      this.changeHistory()

      await this.view.render(renderer)
      this.complete = true
      session.frameRendered(fetchResponse, this.element)
      session.frameLoaded(this.element)
      await this.fetchResponseLoaded(fetchResponse)
    } else if (this.#willHandleFrameMissingFromResponse(fetchResponse)) {
      this.#handleFrameMissingFromResponse(fetchResponse)
    }
  }

  async #visit(url) {
    const request = new FetchRequest(this, FetchMethod.get, url, new URLSearchParams(), this.element)

    this.#currentFetchRequest?.cancel()
    this.#currentFetchRequest = request

    // Consume the morph-refresh tag exactly once, before perform() dispatches
    // turbo:before-fetch-request — a listener that synchronously starts another
    // visit must not inherit this request's morph-refresh classification.
    this.#currentRequestIsMorphRefresh = this.#performingMorphRefresh
    this.#performingMorphRefresh = false

    return new Promise((resolve) => {
      this.#resolveVisitPromise = () => {
        this.#resolveVisitPromise = () => {}
        this.#currentFetchRequest = null
        this.#currentRequestIsMorphRefresh = false
        resolve()
      }
      request.perform()
    })
  }

  // Settle the request that just completed. A stale settlement — from a request
  // that was already superseded (e.g. an ordinary fetch whose render finished
  // after a morph started its replacement) — is ignored so it can't resolve or
  // clear the newer in-flight request's state. When the current morph refresh
  // settles and a morph arrived while it was in flight, start a single coalesced
  // follow-up. #performMorphRefresh reuses reload()'s gating, so a disconnected
  // or disabled frame never issues a deferred fetch.
  #finishRequest(request) {
    if (request !== this.#currentFetchRequest) return

    const wasMorphRefresh = this.#currentRequestIsMorphRefresh
    this.#resolveVisitPromise()

    if (wasMorphRefresh && this.#pendingMorphRefresh) {
      this.#performMorphRefresh()
    }
  }

  // Cancel the in-flight request without installing a replacement. An aborted
  // request never reaches #finishRequest (perform() swallows the AbortError), so
  // its identity and morph-refresh marker must be retired here — otherwise the
  // marker would keep pointing at a dead request and every later morph would
  // coalesce behind it forever.
  #cancelFetchRequest() {
    this.#currentFetchRequest?.cancel()
    this.#currentFetchRequest = null
    this.#currentRequestIsMorphRefresh = false
  }

  #navigateFrame(element, url, submitter) {
    const frame = this.#findFrameElement(element, submitter)

    frame.delegate.proposeVisitIfNavigatedWithAction(frame, getVisitAction(submitter, element, frame))

    this.#withCurrentNavigationElement(element, () => {
      frame.src = url
    })
  }

  proposeVisitIfNavigatedWithAction(frame, action = null) {
    this.action = action

    if (this.action) {
      const pageSnapshot = PageSnapshot.fromElement(frame).clone()
      const { visitCachedSnapshot } = frame.delegate

      frame.delegate.fetchResponseLoaded = async (fetchResponse) => {
        if (frame.src) {
          const { statusCode, redirected } = fetchResponse
          const responseHTML = await fetchResponse.responseHTML
          const response = { statusCode, redirected, responseHTML }
          const options = {
            response,
            visitCachedSnapshot,
            willRender: false,
            updateHistory: false,
            restorationIdentifier: this.restorationIdentifier,
            snapshot: pageSnapshot
          }

          if (this.action) options.action = this.action

          session.visit(frame.src, options)
        }
      }
    }
  }

  changeHistory() {
    if (this.action) {
      const method = getHistoryMethodForAction(this.action)
      session.history.update(method, expandURL(this.element.src || ""), this.restorationIdentifier)
    }
  }

  async #handleUnvisitableFrameResponse(fetchResponse) {
    console.warn(
      `The response (${fetchResponse.statusCode}) from <turbo-frame id="${this.element.id}"> is performing a full page visit due to turbo-visit-control.`
    )

    await this.#visitResponse(fetchResponse.response)
  }

  #willHandleFrameMissingFromResponse(fetchResponse) {
    this.element.setAttribute("complete", "")

    const response = fetchResponse.response
    const visit = async (url, options) => {
      if (url instanceof Response) {
        this.#visitResponse(url)
      } else {
        session.visit(url, options)
      }
    }

    const event = dispatch("turbo:frame-missing", {
      target: this.element,
      detail: { response, visit },
      cancelable: true
    })

    return !event.defaultPrevented
  }

  #handleFrameMissingFromResponse(fetchResponse) {
    this.view.missing()
    this.#throwFrameMissingError(fetchResponse)
  }

  #throwFrameMissingError(fetchResponse) {
    const message = `The response (${fetchResponse.statusCode}) did not contain the expected <turbo-frame id="${this.element.id}"> and will be ignored. To perform a full page visit instead, set turbo-visit-control to reload.`
    throw new TurboFrameMissingError(message)
  }

  async #visitResponse(response) {
    const wrapped = new FetchResponse(response)
    const responseHTML = await wrapped.responseHTML
    const { location, redirected, statusCode } = wrapped

    return session.visit(location, { response: { redirected, statusCode, responseHTML } })
  }

  #findFrameElement(element, submitter) {
    const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target")
    const target = this.#getFrameElementById(id)

    return target instanceof FrameElement ? target : this.element
  }

  async extractForeignFrameElement(container) {
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

  #formActionIsVisitable(form, submitter) {
    const action = getAction(form, submitter)

    return locationIsVisitable(expandURL(action), this.rootLocation)
  }

  #shouldInterceptNavigation(element, submitter) {
    const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target")

    if (element instanceof HTMLFormElement && !this.#formActionIsVisitable(element, submitter)) {
      return false
    }

    if (!this.enabled || id == "_top") {
      return false
    }

    if (id) {
      const frameElement = this.#getFrameElementById(id)
      if (frameElement) {
        return !frameElement.disabled
      } else if (id == "_parent") {
        return false
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

  get disabled() {
    return this.element.disabled
  }

  get enabled() {
    return !this.disabled
  }

  get sourceURL() {
    if (this.element.src) {
      return this.element.src
    }
  }

  set sourceURL(sourceURL) {
    this.#ignoringChangesToAttribute("src", () => {
      this.element.src = sourceURL ?? null
    })
  }

  get loadingStyle() {
    return this.element.loading
  }

  get isLoading() {
    return this.formSubmission !== undefined || this.#resolveVisitPromise() !== undefined
  }

  get complete() {
    return this.element.hasAttribute("complete")
  }

  set complete(value) {
    if (value) {
      this.element.setAttribute("complete", "")
    } else {
      this.element.removeAttribute("complete")
    }
  }

  get isActive() {
    return this.element.isActive && this.#connected
  }

  get rootLocation() {
    const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`)
    const root = meta?.content ?? "/"
    return expandURL(root)
  }

  #isIgnoringChangesTo(attributeName) {
    return this.#ignoredAttributes.has(attributeName)
  }

  #ignoringChangesToAttribute(attributeName, callback) {
    this.#ignoredAttributes.add(attributeName)
    callback()
    this.#ignoredAttributes.delete(attributeName)
  }

  #withCurrentNavigationElement(element, callback) {
    this.currentNavigationElement = element
    callback()
    delete this.currentNavigationElement
  }

  #getFrameElementById(id) {
    if (id != null) {
      const element = id === "_parent" ?
        this.element.parentElement.closest("turbo-frame") :
        document.getElementById(id)
      if (element instanceof FrameElement) {
        return element
      }
    }
  }
}

function activateElement(element, currentURL) {
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
