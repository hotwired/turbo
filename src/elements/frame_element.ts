import { FetchResponse } from "../fetch_response"
import { FrameController } from "../frame_controller"

export class FrameElement extends HTMLElement {
  readonly controller: FrameController

  static get observedAttributes() {
    return ["src"]
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

  attributeChangedCallback() {
    if (this.src && this.isActive) {
      const value = this.controller.visit(this.src)
      Object.defineProperty(this, "loaded", { value, configurable: true })
    }
  }

  formSubmissionIntercepted(element: HTMLFormElement) {
    this.controller.formSubmissionIntercepted(element)
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

  get loaded(): Promise<FetchResponse | undefined> {
    return Promise.resolve(undefined)
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

customElements.define("turbo-frame", FrameElement)
