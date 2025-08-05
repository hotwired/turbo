import { urlsAreEqual } from "../core/url"
import { setCookie } from "../util"

/**
 * Enables offline support
 *
 * @customElement turbo-offline
 * @example
 *   <turbo-offline serviceWorkerUrl="/service-worker.js" scope="/" serviceWorkerType="module" nativeSupport="true" />
 */
export class OfflineElement extends HTMLElement {
  connectedCallback() {
    if (!("serviceWorker" in navigator)) {
      return console.warn("Service Worker not available.")
    }

    this.registerServiceWorker()
  }

  async registerServiceWorker() {
    if (this.supportsNative) {
      // Cookie for Hotwire Native's overridden UA
      const oneYear = 365 * 24 * 60 * 60 * 1000
      setCookie("x_user_agent", window.navigator.userAgent, oneYear)
    }

    if (document.readyState !== "complete") {
      await new Promise(resolve => window.addEventListener("load", resolve))
    }

    // Check if there's already a service worker registered for a different location
    const controller = navigator.serviceWorker.controller
    if (controller && !urlsAreEqual(controller.scriptURL, this.serviceWorkerUrl)) {
      console.warn(
        `Expected service worker script ${this.serviceWorkerUrl} but found ${controller.scriptURL}. ` + `This may indicate multiple service workers or a cached version.`
      )
    }

    try {
      const registration = await navigator.serviceWorker.register(this.serviceWorkerUrl, { scope: this.scope, type: this.serviceWorkerType })

      // Check the registration result for any mismatches
      const registered = registration.active || registration.waiting || registration.installing
      if (registered && !urlsAreEqual(registered.scriptURL, this.serviceWorkerUrl)) {
        console.warn(
          `Service worker registered successfully, but the active/waiting SW has script ${registered.scriptURL} ` +
          `instead of expected ${this.serviceWorkerUrl}.`
        )
      }

      return registration
    } catch(error) {
      console.error(error)
    }
  }

  get serviceWorkerUrl() {
    return this.getAttribute("serviceWorkerUrl")
  }

  get scope() {
    return this.getAttribute("scope")
  }

  get serviceWorkerType() {
    return this.getAttribute("serviceWorkerType")
  }

  get supportsNative() {
    return this.getAttribute("nativeSupport") == "true"
  }
}
