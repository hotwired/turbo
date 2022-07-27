export type Action = "advance" | "replace" | "restore"

export function isAction(action: any): action is Action {
  return action == "advance" || action == "replace" || action == "restore"
}

export type Position = { x: number; y: number }

export type StreamSource = {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent) => void,
    options?: boolean | EventListenerOptions
  ): void
}

export type ResolvingFunctions<T = unknown> = {
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: any): void
}
