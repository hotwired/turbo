import { unindent } from "../../util"

export class ProgressBar {
  static animationDuration = 300/*ms*/
  static color = "#0076ff"

  static get defaultCSS() {
    return unindent`
      .turbo-progress-bar {
        position: fixed;
        display: block;
        top: 0;
        left: 0;
        height: 3px;
        background: transparent;
        z-index: 9999;
        transition:
          opacity ${ProgressBar.animationDuration / 2}ms ${ProgressBar.animationDuration / 2}ms ease-in;
        transform: translate3d(0, 0, 0);
        width: 100%;
        -webkit-appearance: none;
      }
      .turbo-progress-bar::-ms-fill {
        background: ${ProgressBar.color};
        transition: width ${ProgressBar.animationDuration}ms ease-out;
      }
      .turbo-progress-bar::::-moz-progress-bar {
        background: ${ProgressBar.color};
        transition: width ${ProgressBar.animationDuration}ms ease-out;
      }
      .turbo-progress-bar::-webkit-progress-bar {
        background: transparent;
      }
      .turbo-progress-bar::-webkit-progress-value {
        background: ${ProgressBar.color};
        transition: width ${ProgressBar.animationDuration}ms ease-out;
      }
    `
  }

  readonly stylesheetElement: HTMLStyleElement
  readonly progressElement: HTMLProgressElement

  hiding = false
  trickleInterval?: number
  visible = false

  constructor() {
    this.stylesheetElement = this.createStylesheetElement()
    this.progressElement = this.createProgressElement()
    this.installStylesheetElement()
    this.value = 0
  }

  show() {
    if (!this.visible) {
      this.visible = true
      this.installProgressElement()
      this.startTrickling()
    }
  }

  hide() {
    if (this.visible && !this.hiding) {
      this.hiding = true
      this.fadeProgressElement(() => {
        this.uninstallProgressElement()
        this.stopTrickling()
        this.visible = false
        this.hiding = false
      })
    }
  }

  get value(): number {
    return this.progressElement.value
  }

  set value(value: number) {
    this.progressElement.value = Math.min(value, 1.0)
  }

  // Private

  installStylesheetElement() {
    document.head.insertBefore(this.stylesheetElement, document.head.firstChild)
  }

  installProgressElement() {
    this.value = 0
    this.progressElement.style.opacity = "1"
    document.documentElement.insertBefore(this.progressElement, document.body)
  }

  fadeProgressElement(callback: () => void) {
    this.progressElement.style.opacity = "0"
    setTimeout(callback, ProgressBar.animationDuration * 1.5)
  }

  uninstallProgressElement() {
    if (this.progressElement.parentNode) {
      document.documentElement.removeChild(this.progressElement)
    }
  }

  startTrickling() {
    if (!this.trickleInterval) {
      this.trickleInterval = window.setInterval(this.trickle, ProgressBar.animationDuration)
    }
  }

  stopTrickling() {
    window.clearInterval(this.trickleInterval)
    delete this.trickleInterval
  }

  trickle = () => {
    this.value = this.value + (Math.random() / 100)
  }

  createStylesheetElement() {
    const element = document.createElement("style")
    element.type = "text/css"
    element.textContent = ProgressBar.defaultCSS
    return element
  }

  createProgressElement() {
    const element = document.createElement("progress")
    element.className = "turbo-progress-bar"
    return element
  }
}
