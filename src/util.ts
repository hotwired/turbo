export type DispatchOptions<T extends CustomEvent> = {
  target: EventTarget
  cancelable: boolean
  detail: T["detail"]
}

export function dispatch<T extends CustomEvent>(
  eventName: string,
  { target, cancelable, detail }: Partial<DispatchOptions<T>> = {}
) {
  const event = new CustomEvent<T["detail"]>(eventName, {
    cancelable,
    bubbles: true,
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

export function attributeTrue(element: Element, attributeName: string) {
  return element.getAttribute(attributeName) === "true"
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
