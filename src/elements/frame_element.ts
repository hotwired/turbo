import { FetchResponse } from "../http/fetch_response"

export enum FrameLoadingStyle { eager = "eager", lazy = "lazy" }

export interface FrameElementDelegate {
  connect(): void
  disconnect(): void
  loadingStyleChanged(): void
  sourceURLChanged(): void
  disabledChanged(): void
  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement): void
  loadResponse(response: FetchResponse): void
  isLoading: boolean
}

export class FrameElement extends HTMLElement {
  static delegateConstructor: new (element: FrameElement) => FrameElementDelegate

  loaded: Promise<FetchResponse | void> = Promise.resolve()
  readonly delegate: FrameElementDelegate

  static get observedAttributes() {
    return ["disabled", "loading", "src"]
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
    const { src } = this;
    this.src = null;
    this.src = src;
  }

  attributeChangedCallback(name: string) {
    if (name == "loading") {
      this.delegate.loadingStyleChanged()
    } else if (name == "src") {
      this.delegate.sourceURLChanged()
    } else {
      this.delegate.disabledChanged()
    }
  }

  get src() {
    return this.getAttribute("src")
  }

  set src(value: string | null) {
    if (value) {
      this.setAttribute("src", value)
    } else {
      this.removeAttribute("src")
    }
  }

  get reloadable() {
    return this.getAttribute("data-turbo-frame-reload") == "true"
  }

  get loading(): FrameLoadingStyle {
    return frameLoadingStyleFromString(this.getAttribute("loading") || "")
  }

  set loading(value: FrameLoadingStyle) {
    if (value) {
      this.setAttribute("loading", value)
    } else {
      this.removeAttribute("loading")
    }
  }

  get disabled() {
    return this.hasAttribute("disabled")
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute("disabled", "")
    } else {
      this.removeAttribute("disabled")
    }
  }

  get autoscroll() {
    return this.hasAttribute("autoscroll")
  }

  set autoscroll(value: boolean) {
    if (value) {
      this.setAttribute("autoscroll", "")
    } else {
      this.removeAttribute("autoscroll")
    }
  }

  get complete() {
    return !this.delegate.isLoading
  }

  get isActive() {
    return this.ownerDocument === document && !this.isPreview
  }

  get isPreview() {
    return this.ownerDocument?.documentElement?.hasAttribute("data-turbo-preview")
  }
}

function frameLoadingStyleFromString(style: string) {
  switch (style.toLowerCase()) {
    case "lazy":  return FrameLoadingStyle.lazy
    default:      return FrameLoadingStyle.eager
  }
}
