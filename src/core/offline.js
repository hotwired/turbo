import { urlsAreEqual } from "./url"
import { setCookie } from "../util"

class Offline {
  serviceWorker

  async start(url = "/service-worker.js", { scope = "/", type = "module", native = true } = {}) {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Worker not available.")
      return
    }

    if (native) this.#setUserAgentCookie()

    await this.#domReady()

     // Check if there's already a service worker registered for a different location
    this.#checkExistingController(navigator.serviceWorker.controller, url)

    try {
      const registration = await navigator.serviceWorker.register(this.url, this.registrationOptions)

      // Check the registration result for any mismatches
      const registered = registration.active || registration.waiting || registration.installing
      this.#checkExistingController(registered, url)

      this.serviceWorker = registered
      return registration
    } catch(error) {
      console.error(error)
    }
  }

  #setUserAgentCookie() {
    // Cookie for Hotwire Native's overridden UA
    const oneYear = 365 * 24 * 60 * 60 * 1000
    setCookie("x_user_agent", window.navigator.userAgent, oneYear)
  }

  #checkExistingController(controller, url) {
    if (controller && !urlsAreEqual(controller.scriptURL, url)) {
      console.warn(
        `Expected service worker script ${url} but found ${controller.scriptURL}. ` +
        `This may indicate multiple service workers or a cached version.`
      )
    }
  }

  #domReady() {
    return new Promise((resolve) => {
      if (document.readyState !== "complete") {
        document.addEventListener("DOMContentLoaded", () => resolve())
      } else {
        resolve()
      }
    })
  }
}

export const offline = new Offline()
