// Type-level tests: compiled by `yarn test:types`, never run.
import {
  StreamActions,
  PageSnapshot,
  config,
  type SubmitterConfig,
  type TurboReloadEvent,
  type TurboSession,
  morphElements,
  type ProposedVisit,
  type RefreshOptions,
  type RestorationData,
  type TimingMetric,
  type TurboStreamAction,
  type Visit,
  type VisitDirection,
  type VisitState,
  type FormSubmission,
  type FormSubmissionOutcome,
  type FormSubmissionResult,
  type FetchRequest,
  type FetchResponse,
  type FrameElement,
  type StreamRefreshOptions,
  type TurboBeforeFrameMorphEvent,
  type TurboEventName,
  type TurboFetchOptions
} from "../../index"
import type { FrameController } from "../../core/frames/frame_controller"
import { LRUCache } from "../../core/lru_cache"

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
function assertType<T extends true>(): T | void {}

// Types reachable from exported signatures can be named from the package root.
assertType<Equals<Visit["state"], VisitState>>()
assertType<Equals<Visit["direction"], VisitDirection>>()
assertType<Equals<Visit["refresh"], RefreshOptions>>()
assertType<Equals<Visit["restorationData"], RestorationData>>()
assertType<Equals<keyof NonNullable<Visit["timingMetrics"]>, TimingMetric>>()
assertType<Equals<ReturnType<FrameController["proposeVisitIfNavigatedWithAction"]>, ProposedVisit | null>>()

// Built-in stream actions are always defined.
assertType<Equals<typeof StreamActions.append, TurboStreamAction>>()
assertType<Equals<typeof StreamActions.refresh, TurboStreamAction>>()

// An arbitrary key may be missing, so it must be checked before calling.
assertType<Equals<typeof StreamActions.nonexistent, TurboStreamAction | undefined>>()

// Custom actions can still be registered.
StreamActions.custom = function () {
  this.targetElements.forEach((element) => element.remove())
}

// beforeNodeMorphed is also called with no newElement when a node is about to be removed.
morphElements(document.body, document.createElement("body"), {
  callbacks: {
    beforeNodeMorphed(currentElement, newElement) {
      assertType<Equals<typeof currentElement, Element>>()
      assertType<Equals<typeof newElement, Node | undefined>>()
      return true
    }
  }
})

// forms.submitter takes a built-in name or a custom config, and always reads back as a config.
config.forms.submitter = "aria-disabled"
config.forms.submitter = { beforeSubmit() {}, afterSubmit() {} }
assertType<Equals<(typeof config)["forms"]["submitter"], SubmitterConfig>>()
// @ts-expect-error -- not a built-in submitter config
config.forms.submitter = "disabeld"
// @ts-expect-error -- null would make form submissions throw
config.forms.submitter = null

// Head snapshot lookups return the element type for the requested kind.
declare const snapshot: PageSnapshot
const scripts = snapshot.headSnapshot.getElementsMatchingTypeNotInSnapshot("script", snapshot.headSnapshot)
assertType<Equals<typeof scripts, HTMLScriptElement[]>>()

// turbo:reload names the context keys Turbo sets.
declare const reload: TurboReloadEvent
assertType<Equals<NonNullable<NonNullable<typeof reload.detail>["context"]>["location"], URL | string | undefined>>()
assertType<Equals<NonNullable<NonNullable<typeof reload.detail>["context"]>["statusCode"], number | undefined>>()

// Session collaborators are fixed for the session's lifetime.
declare const turboSession: TurboSession
// @ts-expect-error -- readonly
turboSession.cache = turboSession.cache
// @ts-expect-error -- readonly
turboSession.view.snapshotCache = turboSession.view.snapshotCache

// An LRUCache needs a toCacheKey function unless its keys are already valid cache keys.
new LRUCache<string, number>(10)
new LRUCache<URL, number, string>(10, (url) => url.toString())
// @ts-expect-error -- URL objects are not valid cache keys
new LRUCache<URL, number>(10)

// Autofocusable elements may be SVG elements.
assertType<Equals<NonNullable<PageSnapshot["firstAutofocusableElement"]>, Element & HTMLOrSVGElement>>()

// A mixed key union is rejected too: a URL and its string would share an entry.
// @ts-expect-error -- URL is not a valid cache key
new LRUCache<string | URL, number>(10)

// Submitter callbacks receive any HTMLElement, since Turbo.session.submitForm accepts one.
assertType<Equals<Parameters<SubmitterConfig["beforeSubmit"]>[0], HTMLElement>>()

// PageSnapshot.fromDocument only needs the three elements it reads.
declare const parts: Pick<Document, "documentElement" | "body" | "head">
PageSnapshot.fromDocument(parts)

// A form submission's outcome narrows on success and error.
declare const submission: FormSubmission
const outcome = submission.result
if (outcome && !outcome.success) {
  if (outcome.error) {
    assertType<Equals<typeof outcome.error, Error>>()
  } else {
    assertType<Equals<typeof outcome.fetchResponse, FetchResponse>>()
  }
}
// @ts-expect-error -- a failed outcome has either a response or an error
const impossible: FormSubmissionOutcome = { success: false }
void impossible

// turbo:submit-end carries the submission's outcome, or nothing when it was aborted.
declare const finished: FormSubmissionOutcome
const endDetail: FormSubmissionResult = { formSubmission: submission, ...finished }
const abortedDetail: FormSubmissionResult = { formSubmission: submission }
void [endDetail, abortedDetail]

// A request's own fetch options are the object turbo:before-fetch-request listeners change.
assertType<Equals<FetchRequest["fetchOptions"], TurboFetchOptions>>()
declare const request: FetchRequest
assertType<Equals<(typeof request.headers)[string], string>>()
assertType<Equals<typeof request.body, BodyInit | null>>()

// session.refresh takes its own options type, exported under its own name.
assertType<Equals<Parameters<TurboSession["refresh"]>[1], StreamRefreshOptions | string | undefined>>()

// turbo:before-frame-morph is dispatched with frames.
assertType<Equals<TurboBeforeFrameMorphEvent["detail"]["currentElement"], FrameElement>>()
assertType<Equals<TurboBeforeFrameMorphEvent["detail"]["newElement"], FrameElement>>()

// Every Turbo event name, so a dropped map entry fails here.
assertType<
  Equals<
    TurboEventName,
    | "turbo:before-cache"
    | "turbo:before-fetch-request"
    | "turbo:before-fetch-response"
    | "turbo:before-frame-morph"
    | "turbo:before-frame-render"
    | "turbo:before-morph-attribute"
    | "turbo:before-morph-element"
    | "turbo:before-prefetch"
    | "turbo:before-render"
    | "turbo:before-stream-render"
    | "turbo:before-visit"
    | "turbo:click"
    | "turbo:fetch-request-error"
    | "turbo:frame-load"
    | "turbo:frame-missing"
    | "turbo:frame-render"
    | "turbo:load"
    | "turbo:morph"
    | "turbo:morph-element"
    | "turbo:reload"
    | "turbo:render"
    | "turbo:submit-end"
    | "turbo:submit-start"
    | "turbo:visit"
  >
>()

// Data that is set once is readonly.
declare const visit: Visit
// @ts-expect-error -- readonly
visit.identifier = "x"
// @ts-expect-error -- readonly
visit.timingMetrics = {}
// @ts-expect-error -- the snapshot cache's entries are not written directly
turboSession.view.snapshotCache.snapshots["/"] = undefined
