import { expandURL } from "./core/url"

export function activateScriptElement(element) {
  if (element.getAttribute("data-turbo-eval") == "false") {
    return element
  } else {
    const createdScriptElement = document.createElement("script")
    const cspNonce = getCspNonce()
    if (cspNonce) {
      createdScriptElement.nonce = cspNonce
    }
    createdScriptElement.textContent = element.textContent
    createdScriptElement.async = false
    copyElementAttributes(createdScriptElement, element)
    return createdScriptElement
  }
}

function copyElementAttributes(destinationElement, sourceElement) {
  for (const { name, value } of sourceElement.attributes) {
    destinationElement.setAttribute(name, value)
  }
}

export function createDocumentFragment(html) {
  const template = document.createElement("template")
  template.innerHTML = html
  return template.content
}

export function dispatch(eventName, { target, cancelable, detail } = {}) {
  const event = new CustomEvent(eventName, {
    cancelable,
    bubbles: true,
    composed: true,
    detail
  })

  if (target && target.isConnected) {
    target.dispatchEvent(event)
  } else {
    document.documentElement.dispatchEvent(event)
  }

  return event
}

export function cancelEvent(event) {
  event.preventDefault()
  event.stopImmediatePropagation()
}

export function nextRepaint() {
  if (document.visibilityState === "hidden") {
    return nextEventLoopTick()
  } else {
    return nextAnimationFrame()
  }
}

export function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export function nextEventLoopTick() {
  return new Promise((resolve) => setTimeout(() => resolve(), 0))
}

export function nextMicrotask() {
  return Promise.resolve()
}

export function parseHTMLDocument(html = "") {
  return new DOMParser().parseFromString(html, "text/html")
}

export function unindent(strings, ...values) {
  const lines = interpolate(strings, values).replace(/^\n/, "").split("\n")
  const match = lines[0].match(/^\s+/)
  const indent = match ? match[0].length : 0
  return lines.map((line) => line.slice(indent)).join("\n")
}

function interpolate(strings, values) {
  return strings.reduce((result, string, i) => {
    const value = values[i] == undefined ? "" : values[i]
    return result + string + value
  }, "")
}

export function uuid() {
  return Array.from({ length: 36 })
    .map((_, i) => {
      if (i == 8 || i == 13 || i == 18 || i == 23) {
        return "-"
      } else if (i == 14) {
        return "4"
      } else if (i == 19) {
        return (Math.floor(Math.random() * 4) + 8).toString(16)
      } else {
        return Math.floor(Math.random() * 16).toString(16)
      }
    })
    .join("")
}

export function getAttribute(attributeName, ...elements) {
  for (const value of elements.map((element) => element?.getAttribute(attributeName))) {
    if (typeof value == "string") return value
  }

  return null
}

export function hasAttribute(attributeName, ...elements) {
  return elements.some((element) => element && element.hasAttribute(attributeName))
}

export function markAsBusy(...elements) {
  for (const element of elements) {
    if (element.localName == "turbo-frame") {
      element.setAttribute("busy", "")
    }
    element.setAttribute("aria-busy", "true")
  }
}

export function clearBusyState(...elements) {
  for (const element of elements) {
    if (element.localName == "turbo-frame") {
      element.removeAttribute("busy")
    }

    element.removeAttribute("aria-busy")
  }
}

export function waitForLoad(element, timeoutInMilliseconds = 2000) {
  return new Promise((resolve) => {
    const onComplete = () => {
      element.removeEventListener("error", onComplete)
      element.removeEventListener("load", onComplete)
      resolve()
    }

    element.addEventListener("load", onComplete, { once: true })
    element.addEventListener("error", onComplete, { once: true })
    setTimeout(resolve, timeoutInMilliseconds)
  })
}

export function getHistoryMethodForAction(action) {
  switch (action) {
    case "replace":
      return history.replaceState
    case "advance":
    case "restore":
      return history.pushState
  }
}

export function isAction(action) {
  return action == "advance" || action == "replace" || action == "restore"
}

export function getVisitAction(...elements) {
  const action = getAttribute("data-turbo-action", ...elements)

  return isAction(action) ? action : null
}

function getMetaElement(name) {
  return document.querySelector(`meta[name="${name}"]`)
}

export function getMetaContent(name) {
  const element = getMetaElement(name)
  return element && element.content
}

export function getCspNonce() {
  const element = getMetaElement("csp-nonce")

  if (element) {
    const { nonce, content } = element
    return nonce == "" ? content : nonce
  }
}

export function setMetaContent(name, content) {
  let element = getMetaElement(name)

  if (!element) {
    element = document.createElement("meta")
    element.setAttribute("name", name)

    document.head.appendChild(element)
  }

  element.setAttribute("content", content)

  return element
}

export function findClosestRecursively(element, selector) {
  if (element instanceof Element) {
    return (
      element.closest(selector) || findClosestRecursively(element.assignedSlot || element.getRootNode()?.host, selector)
    )
  }
}

export function elementIsFocusable(element) {
  const inertDisabledOrHidden = "[inert], :disabled, [hidden], details:not([open]), dialog:not([open])"

  return !!element && element.closest(inertDisabledOrHidden) == null && typeof element.focus == "function"
}

export function queryAutofocusableElement(elementOrDocumentFragment) {
  return Array.from(elementOrDocumentFragment.querySelectorAll("[autofocus]")).find(elementIsFocusable)
}

export async function around(callback, reader) {
  const before = reader()

  callback()

  await nextAnimationFrame()

  const after = reader()

  return [before, after]
}

export function doesNotTargetIFrame(name) {
  if (name === "_blank") {
    return false
  } else if (name) {
    for (const element of document.getElementsByName(name)) {
      if (element instanceof HTMLIFrameElement) return false
    }

    return true
  } else {
    return true
  }
}

export function findLinkFromClickTarget(target) {
  return findClosestRecursively(target, "a[href]:not([target^=_]):not([download])")
}

export function getLocationForLink(link) {
  return expandURL(link.getAttribute("href") || "")
}

export function debounce(fn, delay) {
  let timeoutId = null

  return (...args) => {
    const callback = () => fn.apply(this, args)
    clearTimeout(timeoutId)
    timeoutId = setTimeout(callback, delay)
  }
}
