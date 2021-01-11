import { FetchResponse } from "../http/fetch_response"
import { FrameController } from "../core/frames/frame_controller"

export enum FrameLoadingStyle { eager = "eager", lazy = "lazy" }

export class FrameElement extends HTMLElement {
  loaded: Promise<FetchResponse | void> = Promise.resolve()
  readonly controller: FrameController

  static get observedAttributes() {
    return ["loading", "src"]
  }

  constructor() {
    super()
    this.controller = new FrameController(this)
  }

  connectedCallback() {
    this.controller.connect()
  }

  disconnectedCallback() {
    this.controller.disconnect()
  }

  attributeChangedCallback(name: string) {
    if (name == "loading") {
      this.controller.loadingStyleChanged()
    } else if (name == "src") {
      this.controller.sourceURLChanged()
    }
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    this.controller.formSubmissionIntercepted(element, submitter)
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

customElements.define("turbo-frame", FrameElement)
