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
  getVisitAction,
  removeTemporaryElementsFrom
} from "../../util"
import { FormSubmission } from "../drive/form_submission"
import { Snapshot } from "../snapshot"
import { getAction, expandURL, getRequestURL, locationIsVisitable } from "../url"
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
import { VisitState } from "../drive/visit"

export class FrameController {
  #currentFetchRequest = null
  #fetchRequests = new WeakMap()
  #proposedVisit = null
  #resolveVisitPromise = () => {}
  #connected = false
  #hasBeenLoaded = false
  #ignoredAttributes = new Set()
  #shouldMorphFrame = false
  #formSubmissions = new Set()

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

      if (!this.element.hasAttribute("recurse")) {
        this.#currentFetchRequest?.cancel()

        if (!this.element.isConnected) {
          for (const formSubmission of this.#formSubmissions) {
            if (formSubmission.isSafe) formSubmission.stop()
          }
        }
      }
    }
  }

  disabledChanged() {
    if (this.disabled) {
      this.#currentFetchRequest?.cancel()
    } else if (this.loadingStyle == FrameLoadingStyle.eager) {
      this.#loadSourceURL()
    }
  }

  sourceURLChanged() {
    if (this.#isIgnoringChangesTo("src")) return

    if (!this.sourceURL) {
      this.#currentFetchRequest?.cancel()
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

  async loadResponse(fetchResponse, requestURL, proposedVisit = null) {
    if (fetchResponse.redirected || (fetchResponse.succeeded && fetchResponse.isHTML)) {
      const responseURL = expandURL(fetchResponse.response.url)
      if (!fetchResponse.redirected && !responseURL.hash && requestURL) {
        responseURL.hash = requestURL.hash
      }
      this.sourceURL = responseURL.href
    }
    if (proposedVisit) proposedVisit.location = expandURL(this.sourceURL || requestURL)

    try {
      const html = await fetchResponse.responseHTML
      if (html) {
        if (proposedVisit) {
          proposedVisit.response = { statusCode: fetchResponse.statusCode, redirected: fetchResponse.redirected, responseHTML: html }
        }
        const document = parseHTMLDocument(html)
        const pageSnapshot = PageSnapshot.fromDocument(document)

        if (pageSnapshot.isVisitable) {
          await this.#loadFrameResponse(fetchResponse, document, proposedVisit)
        } else {
          await this.#handleUnvisitableFrameResponse(fetchResponse)
        }
      }
    } finally {
      this.#shouldMorphFrame = false
      if (this.#proposedVisit === proposedVisit) this.#proposedVisit = null
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
    this.#startFormSubmission(this.formSubmission, frame)
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
    this.#resolveRequest(request)
  }

  async requestSucceededWithResponse(request, response) {
    await this.loadResponse(response, request.url, this.#fetchRequests.get(request)?.proposedVisit)
    this.#resolveRequest(request)
  }

  async requestFailedWithResponse(request, response) {
    await this.loadResponse(response, request.url, this.#fetchRequests.get(request)?.proposedVisit)
    this.#resolveRequest(request)
  }

  requestErrored(request, error) {
    console.error(error)
    this.#resolveRequest(request)
  }

  requestFinished(request) {
    if (!this.#currentFetchRequest || this.#currentFetchRequest === request) clearBusyState(this.element)
  }

  // Form submission delegate

  formSubmissionStarted({ formElement }) {
    markAsBusy(formElement, this.#findFrameElement(formElement))
  }

  formSubmissionSucceededWithResponse(formSubmission, response) {
    const frame = this.#findFrameElement(formSubmission.formElement, formSubmission.submitter)

    const proposedVisit = frame.delegate.proposeVisitIfNavigatedWithAction(frame, getVisitAction(formSubmission.submitter, formSubmission.formElement, frame))
    frame.delegate.loadResponse(response, formSubmission.fetchRequest.url, proposedVisit)

    if (!formSubmission.isSafe) {
      session.clearCache()
    }
  }

  formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
    this.element.delegate.loadResponse(fetchResponse, formSubmission.fetchRequest.url)
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

  // Private

  #resolveRequest(request) {
    this.#fetchRequests.get(request)?.resolve()
    this.#fetchRequests.delete(request)
  }

  async #startFormSubmission(formSubmission, frame) {
    const controller = frame.delegate
    const { abortSignal } = formSubmission.fetchRequest
    const unregister = () => controller.#formSubmissions.delete(formSubmission)

    controller.#formSubmissions.add(formSubmission)
    abortSignal.addEventListener("abort", unregister, { once: true })

    try {
      await formSubmission.start()
    } finally {
      abortSignal.removeEventListener("abort", unregister)
      unregister()
    }
  }

  async #loadFrameResponse(fetchResponse, document, proposedVisit) {
    const newFrameElement = await this.extractForeignFrameElement(document.body)
    const rendererClass = this.#shouldMorphFrame ? MorphingFrameRenderer : FrameRenderer

    if (newFrameElement) {
      const snapshot = new Snapshot(newFrameElement)
      const delegate = {
        willRenderFrame: (currentElement) => {
          if (proposedVisit) proposedVisit.previousFrameElement = currentElement.cloneNode(true)
        }
      }
      const renderer = new rendererClass(delegate, this.view.snapshot, snapshot, false, false)
      if (this.view.renderPromise) await this.view.renderPromise
      this.changeHistory(proposedVisit)

      await this.view.render(renderer)
      this.complete = true
      if (proposedVisit) {
        const cachedFrame = proposedVisit.snapshot.element.querySelector(`#${CSS.escape(this.id)}`)
        if (cachedFrame && proposedVisit.previousFrameElement) {
          cachedFrame.replaceChildren(...proposedVisit.previousFrameElement.children)
        }
        delete proposedVisit.previousFrameElement
        proposedVisit.advancedSnapshot = proposedVisit.liveSnapshot.clone()
        if (!proposedVisit.liveSnapshot.element.contains(this.element)) {
          // A permanent frame can move to another page while rendering. Clone it
          // with the same form-state rules as the rest of the cached snapshot.
          const { documentElement, headSnapshot } = proposedVisit.liveSnapshot
          const frameSnapshot = new PageSnapshot(documentElement, this.element, headSnapshot).clone()
          const advancedFrame = proposedVisit.advancedSnapshot.element.querySelector(`#${CSS.escape(this.id)}`)
          advancedFrame?.replaceWith(frameSnapshot.element)
        }
        await this.#cachePromotedVisitIfNeeded(proposedVisit)
      }
      session.frameRendered(fetchResponse, this.element)
      session.frameLoaded(this.element)
      if (proposedVisit) await this.#visitFrameResponse(proposedVisit)
    } else if (this.#willHandleFrameMissingFromResponse(fetchResponse)) {
      this.#handleFrameMissingFromResponse(fetchResponse)
    }
  }

  async #visit(url) {
    const request = new FetchRequest(this, FetchMethod.get, url, new URLSearchParams(), this.element)

    this.#currentFetchRequest?.cancel()
    this.#currentFetchRequest = request

    return new Promise((resolve) => {
      const resolveRequest = () => {
        if (this.#currentFetchRequest === request) {
          this.#resolveVisitPromise = () => {}
          this.#currentFetchRequest = null
        }
        resolve()
      }
      this.#resolveVisitPromise = resolveRequest
      this.#fetchRequests.set(request, { proposedVisit: this.#proposedVisit, resolve: resolveRequest })
      this.#proposedVisit = null
      request.perform()
    })
  }

  #navigateFrame(element, url, submitter) {
    const frame = this.#findFrameElement(element, submitter)

    frame.delegate.proposeVisitIfNavigatedWithAction(frame, getVisitAction(submitter, element, frame))

    this.#withCurrentNavigationElement(element, () => {
      frame.src = url
    })
  }

  proposeVisitIfNavigatedWithAction(frame, action = null) {
    this.#proposedVisit = null

    if (action && frame.ownerDocument.body.contains(frame)) {
      const liveSnapshot = PageSnapshot.fromElement(frame)
      const pageVisit = this.#pageVisitInProgress()
      const proposedVisit = {
        action,
        liveSnapshot,
        snapshot: liveSnapshot.clone(),
        originLocation: expandURL(pageVisit?.historyChanged ? session.view.lastRenderedLocation : session.location),
        restorationIdentifier: this.restorationIdentifier,
        shouldCacheSnapshot: pageVisit?.shouldCacheSnapshot !== false
      }
      this.#proposedVisit = proposedVisit
    }

    return this.#proposedVisit
  }

  changeHistory(proposedVisit) {
    if (proposedVisit) {
      const pageVisit = this.#pageVisitInProgress()
      proposedVisit.shouldCacheSnapshot &&= pageVisit?.shouldCacheSnapshot !== false

      if (document.body === proposedVisit.liveSnapshot.element && !pageVisit?.historyChanged) {
        const method = getHistoryMethodForAction(proposedVisit.action)
        session.history.update(method, proposedVisit.location, proposedVisit.restorationIdentifier)
        proposedVisit.historyChanged = true
        if (pageVisit) session.view.lastRenderedLocation = proposedVisit.location
      }
    }
  }

  #pageVisitInProgress() {
    const visit = session.navigator.currentVisit
    if (visit?.state === VisitState.started && visit.willRender) return visit
  }

  async #cachePromotedVisitIfNeeded(proposedVisit) {
    const pageVisit = this.#pageVisitInProgress()
    proposedVisit.shouldCacheSnapshot &&= pageVisit?.shouldCacheSnapshot !== false
    const ownsPage = document.body === proposedVisit.liveSnapshot.element
    const ownsHistory = session.location.href === proposedVisit.location.href

    if (pageVisit || !ownsPage || !ownsHistory || this.sourceURL !== proposedVisit.location.href) {
      if (ownsPage && ownsHistory) session.view.lastRenderedLocation = proposedVisit.location

      if (proposedVisit.shouldCacheSnapshot) {
        await session.view.cacheSnapshotAtLocation(proposedVisit.snapshot, proposedVisit.originLocation, (snapshot) => {
          removeTemporaryElementsFrom(snapshot.element)
        })
        if (proposedVisit.historyChanged) {
          await session.view.cacheSnapshotAtLocation(proposedVisit.advancedSnapshot, proposedVisit.location, (snapshot) => {
            removeTemporaryElementsFrom(snapshot.element)
          })
        }
      }
      return true
    }
    return false
  }

  async #visitFrameResponse(proposedVisit) {
    if (this.#pageVisitInProgress() || document.body !== proposedVisit.liveSnapshot.element || session.location.href !== proposedVisit.location.href || this.sourceURL !== proposedVisit.location.href) {
      await this.#cachePromotedVisitIfNeeded(proposedVisit)
      return
    }

    session.visit(proposedVisit.location, {
      action: proposedVisit.action,
      response: proposedVisit.response,
      willRender: false,
      updateHistory: false,
      restorationIdentifier: proposedVisit.restorationIdentifier,
      snapshot: proposedVisit.snapshot
    })
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
    if (src != null && currentURL != null && getRequestURL(expandURL(src)) == getRequestURL(expandURL(currentURL))) {
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
