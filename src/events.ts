import { FrameElement } from "./elements/frame_element"
import { StreamElement } from "./elements/stream_element"

import { FrameViewRenderOptions } from "./core/frames/frame_view"
import { PageViewRenderOptions } from "./core/drive/page_view"
import { FormSubmission, FormSubmissionResult } from "./core/drive/form_submission"

import { FetchResponse } from "./http/fetch_response"
import { FetchRequest } from "./http/fetch_request"

import { Action, TimingData, VisitFallback, Render } from "./core/types"

export type TurboBeforeCacheEvent = CustomEvent
export type TurboBeforeRenderEvent = CustomEvent<{ newBody: HTMLBodyElement } & PageViewRenderOptions>
export type TurboBeforeVisitEvent = CustomEvent<{ url: string }>
export type TurboClickEvent = CustomEvent<{ url: string; originalEvent: MouseEvent }>
export type TurboFrameLoadEvent = CustomEvent
export type TurboBeforeFrameRenderEvent = CustomEvent<{ newFrame: FrameElement } & FrameViewRenderOptions>
export type TurboFrameRenderEvent = CustomEvent<{ fetchResponse: FetchResponse }>
export type TurboLoadEvent = CustomEvent<{ url: string; timing: TimingData }>
export type TurboRenderEvent = CustomEvent
export type TurboReloadEvent = CustomEvent
export type TurboVisitEvent = CustomEvent<{ url: string; action: Action }>

export type TurboBeforeStreamRenderEvent = CustomEvent<{ newStream: StreamElement; render: Render }>

export type TurboSubmitStartEvent = CustomEvent<{ formSubmission: FormSubmission }>
export type TurboSubmitEndEvent = CustomEvent<
  { formSubmission: FormSubmission } & { [K in keyof FormSubmissionResult]?: FormSubmissionResult[K] }
>

export type TurboFrameMissingEvent = CustomEvent<{ response: Response; visit: VisitFallback }>

export type TurboBeforeFetchRequestEvent = CustomEvent<{
  fetchOptions: RequestInit
  url: URL
  resume: (value?: any) => void
}>

export type TurboBeforeFetchResponseEvent = CustomEvent<{
  fetchResponse: FetchResponse
}>

export type TurboFetchRequestErrorEvent = CustomEvent<{
  request: FetchRequest
  error: Error
}>

// GlobalEventHandlersEventMap
// ├─ DocumentEventMap
// ├─ WindowEventMap
// ├─ HTMLElementEventMap
// |  ├─ HTMLBodyElementEventMap
// |  ├─ HTMLFrameSetElementEventMap
// |  ├─ HTMLMarqueeElementEventMap
// |  ├─ HTMLMediaElementEventMap
// |
// ├─ SVGElementEventMap
// |  ├─ SVGSVGElementEventMap

// DocumentAndElementEventHandlersEventMap
// ├─ DocumentEventMap
// ├─ HTMLElementEventMap
// |  ├─ HTMLBodyElementEventMap
// |  ├─ HTMLFrameSetElementEventMap
// |  ├─ HTMLMarqueeElementEventMap
// |  ├─ HTMLMediaElementEventMap
// |
// ├─ SVGElementEventMap
// |  ├─ SVGSVGElementEventMap

// WindowEventHandlersEventMap
// ├─ HTMLBodyElementEventMap
// ├─ HTMLFrameSetElementEventMap
// ├─ WindowEventMap

// ElementEventMap
// ├─ SVGElementEventMap
// ├─ HTMLElementEventMap
// |  ├─ HTMLBodyElementEventMap
// |  ├─ HTMLFrameSetElementEventMap
// |  ├─ HTMLMarqueeElementEventMap
// |  ├─ HTMLMediaElementEventMap

export interface TurboElementEventMap {
  "turbo:before-frame-render": TurboBeforeFrameRenderEvent
  "turbo:before-fetch-request": TurboBeforeFetchRequestEvent
  "turbo:before-fetch-response": TurboBeforeFetchResponseEvent
  "turbo:fetch-request-error": TurboFetchRequestErrorEvent
  "turbo:frame-load": TurboFrameLoadEvent
  "turbo:frame-render": TurboFrameRenderEvent
  "turbo:frame-missing": TurboFrameMissingEvent
  "turbo:submit-start": TurboSubmitStartEvent
  "turbo:submit-end": TurboSubmitEndEvent
}

export interface TurboGlobalEventHandlersEventMap extends TurboElementEventMap {
  "turbo:before-cache": TurboBeforeCacheEvent
  "turbo:before-stream-render": TurboBeforeStreamRenderEvent
  "turbo:before-render": TurboBeforeRenderEvent
  "turbo:before-visit": TurboBeforeVisitEvent
  "turbo:click": TurboClickEvent
  "turbo:load": TurboLoadEvent
  "turbo:render": TurboRenderEvent
  "turbo:reload": TurboReloadEvent
  "turbo:visit": TurboVisitEvent
}

declare global {
  interface ElementEventMap extends TurboElementEventMap {}
  interface GlobalEventHandlersEventMap extends TurboGlobalEventHandlersEventMap {}
}
