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

export type StructuredCloneValue =
  | boolean
  | null
  | undefined
  | number
  | bigint
  | string
  | Date
  | RegExp
  | Blob
  | File
  | FileList
  | ArrayBuffer
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array
  | DataView
  | ImageBitmap
  | ImageData
  | Array<StructuredCloneValue>
  | { [key: string]: StructuredCloneValue }
  | Map<StructuredCloneValue, StructuredCloneValue>
  | Set<StructuredCloneValue>
  | DOMException
  | Error
