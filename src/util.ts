import { Action } from "./core/types"

export type DispatchOptions<T extends CustomEvent> = {
  target: EventTarget
  cancelable: boolean
  detail: T["detail"]
}

export function activateScriptElement(element: HTMLScriptElement) {
  if (element.getAttribute("data-turbo-eval") == "false") {
    return element
  } else {
    const createdScriptElement = document.createElement("script")
    const cspNonce = getMetaContent("csp-nonce")
    if (cspNonce) {
      createdScriptElement.nonce = cspNonce
    }
    createdScriptElement.textContent = element.textContent
    createdScriptElement.async = false
    copyElementAttributes(createdScriptElement, element)
    return createdScriptElement
  }
}

function copyElementAttributes(destinationElement: Element, sourceElement: Element) {
  for (const { name, value } of sourceElement.attributes) {
    destinationElement.setAttribute(name, value)
  }
}

export function createDocumentFragment(html: string): DocumentFragment {
  const template = document.createElement("template")
  template.innerHTML = html
  return template.content
}

export function dispatch<T extends CustomEvent>(
  eventName: string,
  { target, cancelable, detail }: Partial<DispatchOptions<T>> = {}
) {
  const event = new CustomEvent<T["detail"]>(eventName, {
    cancelable,
    bubbles: true,
    composed: true,
    detail,
  })

  if (target && (target as Element).isConnected) {
    target.dispatchEvent(event)
  } else {
    document.documentElement.dispatchEvent(event)
  }

  return event
}

export function nextAnimationFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

export function nextEventLoopTick() {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), 0))
}

export function nextMicrotask() {
  return Promise.resolve()
}

export function parseHTMLDocument(html = "") {
  return new DOMParser().parseFromString(html, "text/html")
}

export function nextBeat() {
  return delay(100)
}

export function delay(ms = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function unindent(strings: TemplateStringsArray, ...values: any[]): string {
  const lines = interpolate(strings, values).replace(/^\n/, "").split("\n")
  const match = lines[0].match(/^\s+/)
  const indent = match ? match[0].length : 0
  return lines.map((line) => line.slice(indent)).join("\n")
}

function interpolate(strings: TemplateStringsArray, values: any[]) {
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
        return Math.floor(Math.random() * 15).toString(16)
      }
    })
    .join("")
}

export function getAttribute(attributeName: string, ...elements: (Element | undefined)[]): string | null {
  for (const value of elements.map((element) => element?.getAttribute(attributeName))) {
    if (typeof value == "string") return value
  }

  return null
}

export function hasAttribute(attributeName: string, ...elements: (Element | undefined)[]): boolean {
  return elements.some((element) => element && element.hasAttribute(attributeName))
}

export function markAsBusy(...elements: Element[]) {
  for (const element of elements) {
    if (element.localName == "turbo-frame") {
      element.setAttribute("busy", "")
    }
    element.setAttribute("aria-busy", "true")
  }
}

export function clearBusyState(...elements: Element[]) {
  for (const element of elements) {
    if (element.localName == "turbo-frame") {
      element.removeAttribute("busy")
    }

    element.removeAttribute("aria-busy")
  }
}

export function waitForLoad(element: HTMLLinkElement, timeoutInMilliseconds = 2000): Promise<void> {
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

export function getHistoryMethodForAction(action: Action) {
  switch (action) {
    case "replace":
      return history.replaceState
    case "advance":
    case "restore":
      return history.pushState
  }
}

export function isAction(action: any): action is Action {
  return action == "advance" || action == "replace" || action == "restore"
}

export function getVisitAction(...elements: (Element | undefined)[]): Action | null {
  const action = getAttribute("data-turbo-action", ...elements)

  return isAction(action) ? action : null
}

export function getMetaElement(name: string): HTMLMetaElement | null {
  return document.querySelector(`meta[name="${name}"]`)
}

export function getMetaContent(name: string) {
  const element = getMetaElement(name)
  return element && element.content
}

export function setMetaContent(name: string, content: string) {
  let element = getMetaElement(name)

  if (!element) {
    element = document.createElement("meta")
    element.setAttribute("name", name)

    document.head.appendChild(element)
  }

  element.setAttribute("content", content)

  return element
}

export function findClosestRecursively<E extends Element>(element: Element | null, selector: string): E | undefined {
  if (element instanceof Element) {
    return (
      element.closest<E>(selector) ||
      findClosestRecursively(element.assignedSlot || (element.getRootNode() as ShadowRoot)?.host, selector)
    )
  }
}
