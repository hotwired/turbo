import { VisitOptions } from "./drive/visit"
import { Locatable } from "./url"
import { StreamElement } from "../elements/stream_element"

export type Action = "advance" | "replace" | "restore"
export type Render = (currentElement: StreamElement) => Promise<void>
export type TimingData = unknown
export type VisitFallback = (location: Response | Locatable, options: Partial<VisitOptions>) => Promise<void>

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
