export function defer(callback: () => any) {
  setTimeout(callback, 1)
}

export type DispatchOptions = { target: EventTarget, cancelable: boolean, detail: any }

export function dispatch(eventName: string, { target, cancelable, detail }: Partial<DispatchOptions> = {}) {
  const event = new CustomEvent(eventName, { cancelable, bubbles: true, detail })
  void (target || document.documentElement).dispatchEvent(event)
  return event
}

export function nextAnimationFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

export function unindent(strings: TemplateStringsArray, ...values: any[]): string {
  const lines = trimLeft(interpolate(strings, values)).split("\n")
  const match = lines[0].match(/^\s+/)
  const indent = match ? match[0].length : 0
  return lines.map(line => line.slice(indent)).join("\n")
}

function trimLeft(string: string) {
  return string.replace(/^\n/, "")
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
