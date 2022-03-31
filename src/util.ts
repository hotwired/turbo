import { FetchResponse } from "./http/fetch_response";

export type DispatchOptions = { target: EventTarget, cancelable: boolean, detail: any }

export function dispatch(eventName: string, { target, cancelable, detail }: Partial<DispatchOptions> = {}) {
  const event = new CustomEvent(eventName, { cancelable, bubbles: true, detail })

  if (target && (target as Element).isConnected) {
    target.dispatchEvent(event);
  } else {
    document.documentElement.dispatchEvent(event);
  }

  return event
}

export function nextAnimationFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

export function nextEventLoopTick() {
  return new Promise<void>(resolve => setTimeout(() => resolve(), 0))
}

export function nextMicrotask() {
  return Promise.resolve()
}

export function parseHTMLDocument(html = "") {
  return new DOMParser().parseFromString(html, "text/html")
}

export function unindent(strings: TemplateStringsArray, ...values: any[]): string {
  const lines = interpolate(strings, values).replace(/^\n/, "").split("\n")
  const match = lines[0].match(/^\s+/)
  const indent = match ? match[0].length : 0
  return lines.map(line => line.slice(indent)).join("\n")
}

function interpolate(strings: TemplateStringsArray, values: any[]) {
  return strings.reduce((result, string, i) => {
    const value = values[i] == undefined ? "" : values[i]
    return result + string + value
  }, "")
}

export function uuid() {
  return Array.apply(null, { length: 36 } as any).map((_, i) => {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      return "-"
    } else if (i == 14) {
      return "4"
    } else if (i == 19) {
      return (Math.floor(Math.random() * 4) + 8).toString(16)
    } else {
      return Math.floor(Math.random() * 15).toString(16)
    }
  }).join("")
}

export function getAttribute(attributeName: string, ...elements: (Element | undefined)[]): string | null {
  for (const value of elements.map(element => element?.getAttribute(attributeName))) {
    if (typeof value == "string") return value
  }

  return null
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

export function reportError(error: FetchResponse | unknown) {
  console.warn(error)
  dispatch('turbo:error', { detail: { error } })
}
