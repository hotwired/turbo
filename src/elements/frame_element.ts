import { FetchResponse } from "../http/fetch_response"

export enum FrameLoadingStyle {
  eager = "eager",
  lazy = "lazy",
}

export type FrameElementObservedAttribute = keyof FrameElement & ("disabled" | "loaded" | "loading" | "src")

export interface FrameElementDelegate {
  connect(): void
  disconnect(): void
  loadedChanged(): void
  loadingStyleChanged(): void
  sourceURLChanged(): void
  disabledChanged(): void
  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement): void
  linkClickIntercepted(element: Element, url: string): void
  loadResponse(response: FetchResponse): void
  fetchResponseLoaded: (fetchResponse: FetchResponse) => void
  isLoading: boolean
}

/**
 * Contains a fragment of HTML which is updated based on navigation within
 * it (e.g. via links or form submissions).
 *
 * @customElement turbo-frame
 * @example
 *   <turbo-frame id="messages">
 *     <a href="/messages/expanded">
 *       Show all expanded messages in this frame.
 *     </a>
 *
 *     <form action="/messages">
 *       Show response from this form within this frame.
 *     </form>
 *   </turbo-frame>
 */
export class FrameElement extends HTMLElement {
  static delegateConstructor: new (element: FrameElement) => FrameElementDelegate

  loaded: Promise<FetchResponse | void> = Promise.resolve()
  readonly delegate: FrameElementDelegate

  static get observedAttributes(): FrameElementObservedAttribute[] {
    return ["disabled", "loaded", "loading", "src"]
  }

  constructor() {
    super()
    this.delegate = new FrameElement.delegateConstructor(this)
  }

  connectedCallback() {
    this.delegate.connect()
  }

  disconnectedCallback() {
    this.delegate.disconnect()
  }

  reload() {
    const { src } = this
    this.removeAttribute("loaded")
    this.src = null
    this.src = src
  }

  attributeChangedCallback(name: string) {
    if (name == "loading") {
      this.delegate.loadingStyleChanged()
    } else if (name == "loaded") {
      this.delegate.loadedChanged()
    } else if (name == "src") {
      this.delegate.sourceURLChanged()
    } else {
      this.delegate.disabledChanged()
    }
  }

  /**
   * Gets the URL to lazily load source HTML from
   */
  get src() {
    return this.getAttribute("src")
  }

  /**
   * Sets the URL to lazily load source HTML from
   */
  set src(value: string | null) {
    if (value) {
      this.setAttribute("src", value)
    } else {
      this.removeAttribute("src")
    }
  }

  /**
   * Determines if the element is loading
   */
  get loading(): FrameLoadingStyle {
    return frameLoadingStyleFromString(this.getAttribute("loading") || "")
  }

  /**
   * Sets the value of if the element is loading
   */
  set loading(value: FrameLoadingStyle) {
    if (value) {
      this.setAttribute("loading", value)
    } else {
      this.removeAttribute("loading")
    }
  }

  /**
   * Gets the disabled state of the frame.
   *
   * If disabled, no requests will be intercepted by the frame.
   */
  get disabled() {
    return this.hasAttribute("disabled")
  }

  /**
   * Sets the disabled state of the frame.
   *
   * If disabled, no requests will be intercepted by the frame.
   */
  set disabled(value: boolean) {
    if (value) {
      this.setAttribute("disabled", "")
    } else {
      this.removeAttribute("disabled")
    }
  }

  /**
   * Gets the autoscroll state of the frame.
   *
   * If true, the frame will be scrolled into view automatically on update.
   */
  get autoscroll() {
    return this.hasAttribute("autoscroll")
  }

  /**
   * Sets the autoscroll state of the frame.
   *
   * If true, the frame will be scrolled into view automatically on update.
   */
  set autoscroll(value: boolean) {
    if (value) {
      this.setAttribute("autoscroll", "")
    } else {
      this.removeAttribute("autoscroll")
    }
  }

  /**
   * Determines if the element has finished loading
   */
  get complete() {
    return !this.delegate.isLoading
  }

  /**
   * Gets the active state of the frame.
   *
   * If inactive, source changes will not be observed.
   */
  get isActive() {
    return this.ownerDocument === document && !this.isPreview
  }

  /**
   * Sets the active state of the frame.
   *
   * If inactive, source changes will not be observed.
   */
  get isPreview() {
    return this.ownerDocument?.documentElement?.hasAttribute("data-turbo-preview")
  }
}

function frameLoadingStyleFromString(style: string) {
  switch (style.toLowerCase()) {
    case "lazy":
      return FrameLoadingStyle.lazy
    default:
      return FrameLoadingStyle.eager
  }
}
