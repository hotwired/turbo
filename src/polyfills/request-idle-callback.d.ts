export interface IdleDeadline {
  readonly didTimeout: boolean
  timeRemaining(): DOMHighResTimeStamp
}

export const requestIdleCallback: (cb: (deadline: IdleDeadline) => void) => number
export const cancelIdleCallback: (handle: number) => void
