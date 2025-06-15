import { unindent, getCspNonce } from "../../util"

export const ProgressBarID = "turbo-progress-bar"

export class ProgressBar {
  static animationDuration = 300 /*ms*/

  static get defaultCSS() {
    return unindent`
      .turbo-progress-bar {
        position: var(--progress-bar-position, fixed);
        display: var(--progress-bar-display, block);
        top: var(--progress-bar-top, 0);
        left: var(--progress-bar-left, 0);
        height: var(--progress-bar-height, 3px);
        background-color: var(--progress-bar-backgroundc-color, #0076ff);
        border-radius: var(--progress-bar-border-radius, 0);
        box-shadow: var(--progress-bar-box-shadow, none);
        z-index: var(--progress-bar-z-index, 2147483647);
        transition:
          width ${ProgressBar.animationDuration}ms ease-out,
          opacity ${ProgressBar.animationDuration / 2}ms ${ProgressBar.animationDuration / 2}ms ease-in;
        transform: translate3d(0, 0, 0);
      }
    `
  }

  hiding = false
  value = 0
  visible = false

  constructor() {
    this.stylesheetElement = this.createStylesheetElement()
    this.progressElement = this.createProgressElement()
    this.installStylesheetElement()
    this.setValue(0)
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

  setValue(value) {
    this.value = value
    this.refresh()
  }

  // Private

  installStylesheetElement() {
    document.head.insertBefore(this.stylesheetElement, document.head.firstChild)
  }

  installProgressElement() {
    this.progressElement.style.width = "0"
    this.progressElement.style.opacity = "1"
    document.documentElement.insertBefore(this.progressElement, document.body)
    this.refresh()
  }

  fadeProgressElement(callback) {
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
    this.setValue(this.value + Math.random() / 100)
  }

  refresh() {
    requestAnimationFrame(() => {
      this.progressElement.style.width = `${10 + this.value * 90}%`
    })
  }

  createStylesheetElement() {
    const element = document.createElement("style")
    element.type = "text/css"
    element.textContent = ProgressBar.defaultCSS
    const cspNonce = getCspNonce()
    if (cspNonce) {
      element.nonce = cspNonce
    }
    return element
  }

  createProgressElement() {
    const element = document.createElement("div")
    element.className = "turbo-progress-bar"
    return element
  }
}
