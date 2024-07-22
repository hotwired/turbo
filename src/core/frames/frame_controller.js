import { FrameElement, FrameLoadingStyle } from "../../elements/frame_element"
import { FetchResponse } from "../../http/fetch_response"
import { AppearanceObserver } from "../../observers/appearance_observer"
import {
  dispatch,
  getAttribute,
  uuid,
  getHistoryMethodForAction
} from "../../util"
import { Snapshot } from "../snapshot"
import { getAction, expandURL, urlsAreEqual, locationIsVisitable } from "../url"
import { FormSubmitObserver } from "../../observers/form_submit_observer"
import { FrameView } from "./frame_view"
import { LinkInterceptor } from "./link_interceptor"
import { FormLinkClickObserver } from "../../observers/form_link_click_observer"
import { FrameRenderer } from "./frame_renderer"
import { session } from "../index"
import { PageSnapshot } from "../drive/page_snapshot"
import { TurboFrameMissingError } from "../errors"
import { FrameVisit } from "./frame_visit"

export class FrameController {
  #connected = false
  #hasBeenLoaded = false
  #ignoredAttributes = new Set()
  #frameVisit = null

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
    }
  }

  visit(options) {
    const frameVisit = new FrameVisit(this, this.element, options)
    return frameVisit.start()
  }

  disabledChanged() {
    if (this.loadingStyle == FrameLoadingStyle.eager) {
      this.#loadSourceURL()
    }
  }

  sourceURLChanged() {
    if (this.#isIgnoringChangesTo("src")) return

    if (this.element.isConnected) {
      this.complete = false
    }

    if (this.loadingStyle == FrameLoadingStyle.eager || this.#hasBeenLoaded) {
      this.#loadSourceURL()
    }
  }

  sourceURLReloaded() {
    const { src } = this.element
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
      await this.visit({ url: this.sourceURL })
    }
  }

  async loadResponse(fetchResponse, frameVisit) {
    if (fetchResponse.redirected || (fetchResponse.succeeded && fetchResponse.isHTML)) {
      this.sourceURL = fetchResponse.response.url
    }

    const html = await fetchResponse.responseHTML
    if (html) {
      const pageSnapshot = PageSnapshot.fromHTMLString(html)

      if (pageSnapshot.isVisitable) {
        await this.#loadFrameResponse(fetchResponse, pageSnapshot, frameVisit)
      } else {
        await this.#handleUnvisitableFrameResponse(fetchResponse)
      }
    }
  }

  // Appearance observer delegate

  elementAppearedInViewport(element) {
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
    const frame = this.#findFrameElement(element, submitter)
    frame.delegate.visit(FrameVisit.optionsForSubmit(element, submitter))
  }

  // Frame visit delegate

  shouldVisitFrame(_frameVisit) {
    return this.enabled && this.isActive
  }

  frameVisitStarted(frameVisit) {
    this.#ignoringChangesToAttribute("complete", () => {
      this.#frameVisit?.stop()
      this.#frameVisit = frameVisit
      this.element.removeAttribute("complete")
    })
  }

  async frameVisitSucceededWithResponse(frameVisit, fetchResponse) {
    await this.loadResponse(fetchResponse, frameVisit)

    if (!frameVisit.isSafe) {
      session.clearCache()
    }
  }

  async frameVisitFailedWithResponse(frameVisit, fetchResponse) {
    await this.loadResponse(fetchResponse, frameVisit)

    session.clearCache()
  }

  frameVisitErrored(_frameVisit, fetchRequest, error) {
    console.error(error)
    dispatch("turbo:fetch-request-error", {
      target: this.element,
      detail: { request: fetchRequest, error }
    })
  }

  frameVisitCompleted(_frameVisit) {
    this.hasBeenLoaded = true
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
    this.previousFrameElement = currentElement.cloneNode(true)
  }

  visitCachedSnapshot = ({ element }) => {
    const frame = element.querySelector("#" + this.element.id)

    if (frame && this.previousFrameElement) {
      frame.replaceChildren(...this.previousFrameElement.children)
    }

    delete this.previousFrameElement
  }

  // Private

  async #loadFrameResponse(fetchResponse, pageSnapshot, frameVisit) {
    const newFrameElement = await this.extractForeignFrameElement(pageSnapshot.element)

    if (newFrameElement) {
      const snapshot = new Snapshot(newFrameElement)
      const renderer = new FrameRenderer(this, this.view.snapshot, snapshot, FrameRenderer.renderElement, false, false)
      if (this.view.renderPromise) await this.view.renderPromise
      this.changeHistory(frameVisit.action)

      await this.view.render(renderer)
      this.complete = true
      session.frameRendered(fetchResponse, this.element)
      session.frameLoaded(this.element)
      await this.#proposeVisitIfNavigatedWithAction(frameVisit, fetchResponse)
    } else if (this.#willHandleFrameMissingFromResponse(fetchResponse)) {
      this.#handleFrameMissingFromResponse(fetchResponse)
    }
  }

  #navigateFrame(element, url) {
    const frame = this.#findFrameElement(element)
    frame.delegate.visit(FrameVisit.optionsForClick(element, expandURL(url)))
  }

  async #proposeVisitIfNavigatedWithAction(frameVisit, fetchResponse) {
    const { frameElement } = frameVisit

    if (frameElement.src && frameVisit.action) {
      const { statusCode, redirected } = fetchResponse
      const responseHTML = await fetchResponse.responseHTML
      const response = { statusCode, redirected, responseHTML }
      const options = {
        response,
        visitCachedSnapshot: frameElement.delegate.visitCachedSnapshot,
        willRender: false,
        updateHistory: false,
        restorationIdentifier: this.restorationIdentifier,
        snapshot: frameVisit.snapshot,
        action: frameVisit.action
      }

      session.visit(frameElement.src, options)
    }
  }

  changeHistory(visitAction) {
    if (visitAction) {
      const method = getHistoryMethodForAction(visitAction)
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
    this.complete = true

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
    return getFrameElementById(id) ?? this.element
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

  set sourceURL(sourceURL) {
    this.#ignoringChangesToAttribute("src", () => {
      this.element.src = sourceURL ?? null
    })
  }

  get loadingStyle() {
    return this.element.loading
  }

  get isLoading() {
    return !!this.#frameVisit
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
}

function getFrameElementById(id) {
  if (id != null) {
    const element = document.getElementById(id)
    if (element instanceof FrameElement) {
      return element
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
