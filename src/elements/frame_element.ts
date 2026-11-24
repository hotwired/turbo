import type { FrameController } from "../core/frames/frame_controller"

export const FrameLoadingStyle = {
  eager: "eager",
  lazy: "lazy"
} as const

export type FrameLoadingStyle = (typeof FrameLoadingStyle)[keyof typeof FrameLoadingStyle]

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
  static delegateConstructor: (new (element: FrameElement) => FrameController) | undefined = undefined

  loaded: Promise<void> = Promise.resolve()
  declare readonly delegate: FrameController

  static get observedAttributes(): string[] {
    return ["disabled", "loading", "src"]
  }

  constructor() {
    super()
    this.delegate = new FrameElement.delegateConstructor!(this)
  }

  connectedCallback(): void {
    this.delegate.connect()
  }

  disconnectedCallback(): void {
    this.delegate.disconnect()
  }

  reload(): Promise<void> {
    return this.delegate.sourceURLReloaded()
  }

  attributeChangedCallback(name: string): void {
    if (name == "loading") {
      this.delegate.loadingStyleChanged()
    } else if (name == "src") {
      this.delegate.sourceURLChanged()
    } else if (name == "disabled") {
      this.delegate.disabledChanged()
    }
  }

  /**
   * Gets the URL to lazily load source HTML from
   */
  get src(): string | null {
    return this.getAttribute("src")
  }

  /**
   * Sets the URL to lazily load source HTML from
   */
  set src(value: string | null | undefined) {
    if (value) {
      this.setAttribute("src", value)
    } else {
      this.removeAttribute("src")
    }
  }

  /**
   * Gets the refresh mode for the frame.
   */
  get refresh(): string | null {
    return this.getAttribute("refresh")
  }

  /**
   * Sets the refresh mode for the frame.
   */
  set refresh(value: string | null | undefined) {
    if (value) {
      this.setAttribute("refresh", value)
    } else {
      this.removeAttribute("refresh")
    }
  }

  // Falsy values other than false (null, "") are returned as-is.
  get shouldReloadWithMorph(): boolean | "" | null {
    return this.src && this.refresh === "morph"
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
  set loading(value: FrameLoadingStyle | null | undefined) {
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
  get disabled(): boolean {
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
  get autoscroll(): boolean {
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
  get complete(): boolean {
    return !this.delegate.isLoading
  }

  /**
   * Gets the active state of the frame.
   *
   * If inactive, source changes will not be observed.
   */
  get isActive(): boolean {
    return this.ownerDocument === document && !this.isPreview
  }

  /**
   * Sets the active state of the frame.
   *
   * If inactive, source changes will not be observed.
   */
  get isPreview(): boolean {
    return this.ownerDocument?.documentElement?.hasAttribute("data-turbo-preview")
  }
}

function frameLoadingStyleFromString(style: string): FrameLoadingStyle {
  switch (style.toLowerCase()) {
    case "lazy":
      return FrameLoadingStyle.lazy
    default:
      return FrameLoadingStyle.eager
  }
}
