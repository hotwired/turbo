import type { FetchRequest, FetchRequestOptions } from "../http/fetch_request"
import type { FetchResponse } from "../http/fetch_response"
import type { FrameElement } from "../elements/frame_element"
import type { StreamElement } from "../elements/stream_element"
import type { FormSubmission } from "./drive/form_submission"
import type { TimingMetrics, VisitOptions } from "./drive/visit"
import type { RenderMethod } from "./renderer"
import type { ViewRenderOptions } from "./view"
import type { Action, StructuredReason } from "./types"

export type TimingData = TimingMetrics

export type StreamRender = (newElement: StreamElement) => void | Promise<void>

export type VisitFallback = (location: URL | string | Response, options?: Partial<VisitOptions>) => Promise<void>

// `success` is missing when the submission was aborted before a response arrived.
export type FormSubmissionResult = { formSubmission: FormSubmission } & (
  | { success: true; error?: undefined; fetchResponse: FetchResponse }
  | { success?: false; error?: Error; fetchResponse?: FetchResponse }
)

// Drive

export type TurboClickEvent = CustomEvent<{ url: string; originalEvent: MouseEvent }>
export type TurboBeforeVisitEvent = CustomEvent<{ url: string }>
export type TurboVisitEvent = CustomEvent<{ url: string; action: Action }>
export type TurboBeforeCacheEvent = CustomEvent<null>
export type TurboBeforePrefetchEvent = CustomEvent<null>
export interface TurboBeforeRenderDetail extends ViewRenderOptions<HTMLBodyElement> {
  newBody: HTMLBodyElement
}
export type TurboBeforeRenderEvent = CustomEvent<TurboBeforeRenderDetail>
export type TurboRenderEvent = CustomEvent<{ renderMethod: RenderMethod }>
export type TurboLoadEvent = CustomEvent<{ url: string; timing: TimingData }>
/** The detail is null when no reason was given: CustomEvent turns an undefined detail into null. */
export type TurboReloadEvent = CustomEvent<StructuredReason | null>

// Forms

export type TurboSubmitStartEvent = CustomEvent<{ formSubmission: FormSubmission }>
export type TurboSubmitEndEvent = CustomEvent<FormSubmissionResult>

// Frames

export type TurboFrameLoadEvent = CustomEvent<null>
export type TurboFrameRenderEvent = CustomEvent<{ fetchResponse: FetchResponse }>
export interface TurboBeforeFrameRenderDetail extends ViewRenderOptions<FrameElement> {
  newFrame: FrameElement
}
export type TurboBeforeFrameRenderEvent = CustomEvent<TurboBeforeFrameRenderDetail>
export type TurboFrameMissingEvent = CustomEvent<{ response: Response; visit: VisitFallback }>

// Fetch

/**
 * The fetch options a turbo:before-fetch-request listener may change before Turbo calls fetch.
 * Listeners may set any body fetch accepts, and must check a header before reading it.
 */
export type TurboFetchOptions = Omit<FetchRequestOptions, "body" | "headers"> & {
  body: BodyInit | null
  headers: { [header: string]: string | undefined }
}

export type TurboBeforeFetchRequestEvent = CustomEvent<{
  fetchOptions: TurboFetchOptions
  url: URL
  resume: (value?: unknown) => void
  /** A listener may set this to a request whose response Turbo should use instead. */
  fetchRequest?: FetchRequest
}>
export type TurboBeforeFetchResponseEvent = CustomEvent<{ fetchResponse: FetchResponse }>
export type TurboFetchRequestErrorEvent = CustomEvent<{ request: FetchRequest; error: Error }>

// Streams

export type TurboBeforeStreamRenderEvent = CustomEvent<{ newStream: StreamElement; render: StreamRender }>

// Morphing

export type TurboMorphEvent = CustomEvent<{ currentElement: Element; newElement: Element }>
export type TurboBeforeMorphElementEvent = CustomEvent<{
  currentElement: Element
  /** Undefined when the element is about to be removed. */
  newElement: Node | undefined
}>
export type TurboMorphElementEvent = CustomEvent<{ currentElement: Element; newElement: Node }>
export type MorphMutationType = "update" | "remove"
export type TurboBeforeMorphAttributeEvent = CustomEvent<{ attributeName: string; mutationType: MorphMutationType }>
export type TurboBeforeFrameMorphEvent = CustomEvent<{ currentElement: Element; newElement: Element }>

/** Events that may be dispatched on an element (and bubble to the document). */
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
  "turbo:click": TurboClickEvent
  "turbo:before-prefetch": TurboBeforePrefetchEvent
  "turbo:before-stream-render": TurboBeforeStreamRenderEvent
  "turbo:before-morph-element": TurboBeforeMorphElementEvent
  "turbo:morph-element": TurboMorphElementEvent
  "turbo:before-morph-attribute": TurboBeforeMorphAttributeEvent
  "turbo:before-frame-morph": TurboBeforeFrameMorphEvent
}

/** All Turbo events, including those only dispatched on the document. */
export interface TurboGlobalEventHandlersEventMap extends TurboElementEventMap {
  "turbo:before-cache": TurboBeforeCacheEvent
  "turbo:before-render": TurboBeforeRenderEvent
  "turbo:before-visit": TurboBeforeVisitEvent
  "turbo:load": TurboLoadEvent
  "turbo:render": TurboRenderEvent
  "turbo:reload": TurboReloadEvent
  "turbo:visit": TurboVisitEvent
  "turbo:morph": TurboMorphEvent
}

export type TurboEventMap = TurboGlobalEventHandlersEventMap

export type TurboEventName = keyof TurboEventMap
