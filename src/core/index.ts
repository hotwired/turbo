import { Session } from "./session"
import { PageRenderer } from "./drive/page_renderer"
import { PageSnapshot } from "./drive/page_snapshot"
import { FrameRenderer } from "./frames/frame_renderer"
import { fetch, recentRequests } from "../http/fetch"
import { config } from "./config"
import { MorphingPageRenderer } from "./drive/morphing_page_renderer"
import { MorphingFrameRenderer } from "./frames/morphing_frame_renderer"
import type { Adapter } from "./native/adapter"
import type { VisitOptions as FullVisitOptions } from "./drive/visit"
import type { StreamMessage } from "./streams/stream_message"
import type { FrameElement } from "../elements/frame_element"
import type { ConfirmMethod, FormMode } from "./config/forms"
import type { Locatable } from "./url"
import type { StreamSource } from "./types"
import type { Cache } from "./cache"
import type { Navigator } from "./drive/navigator"

export { morphChildren, morphElements } from "./morphing"
export { PageRenderer, PageSnapshot, FrameRenderer, fetch, config }

// Types for the public API. Classes Turbo does not export at runtime are exported as types only.
export type * from "./events"
export type { StreamRender as Render } from "./events"
export type { Action, ReloadReason, StreamSource, StructuredReason } from "./types"
export type { Locatable } from "./url"
export type { RenderMethod } from "./renderer"
export type { ViewRenderOptions } from "./view"
export type { Adapter } from "./native/adapter"
export type { BrowserAdapter } from "./native/browser_adapter"
export type { DriveConfig } from "./config/drive"
export type { ConfirmMethod, FormMode, FormsConfig, Submitter, SubmitterConfig, SubmitterName } from "./config/forms"
export type { FormSubmission, FormSubmissionOutcome } from "./drive/form_submission"
export type { Cache, Navigator }
export type { StreamRefreshOptions } from "./session"
export type { History as TurboHistory } from "./drive/history"
export type { MorphOptions } from "./morphing"
export type { NavigatorDelegate } from "./drive/navigator"
export type { PageView } from "./drive/page_view"
export type { ProgressBar } from "./drive/progress_bar"
export type { Session as TurboSession } from "./session"
export type { SnapshotCache } from "./drive/snapshot_cache"
export type { StreamMessage } from "./streams/stream_message"
export type { TurboStreamAction, TurboStreamActions } from "./streams/stream_actions"
export type { RefreshOptions, TimingMetric, Visit, VisitResponse, VisitState } from "./drive/visit"
export type { RestorationData, VisitDirection } from "./drive/history"
export type { ProposedVisit } from "./frames/frame_controller"
/** Options accepted by `Turbo.visit` and `session.visit`. */
export type VisitOptions = Partial<FullVisitOptions>

export type TurboConfig = typeof config

const session = new Session(recentRequests)

// Rename `navigator` to avoid shadowing `window.navigator`
const { cache, navigator: sessionNavigator } = session
export { session, cache, sessionNavigator as navigator }

/**
 * Starts the main session.
 * This initialises any necessary observers such as those to monitor
 * link interactions.
 */
export function start(): void {
  session.start()
}

/**
 * Registers an adapter for the main session.
 *
 * @param adapter Adapter to register
 */
export function registerAdapter(adapter: Adapter): void {
  session.registerAdapter(adapter)
}

/**
 * Performs an application visit to the given location.
 *
 * @param location Location to visit (a URL or path)
 * @param options Options to apply
 * @param options.action Type of history navigation to apply ("restore",
 * "replace" or "advance")
 * @param options.historyChanged Specifies whether the browser history has
 * already been changed for this visit or not
 * @param options.referrer Specifies the referrer of this visit such that
 * navigations to the same page will not result in a new history entry.
 * @param options.snapshotHTML Cached snapshot to render
 * @param options.response Response of the specified location
 * @param options.scroll Scroll behavior to apply after rendering ("preserve"
 * or "reset"). Defaults to resetting the scroll position, unless the visit is
 * a page refresh governed by the `turbo-refresh-scroll` meta tag.
 */
export function visit(location: Locatable, options?: Partial<FullVisitOptions>): void {
  session.visit(location, options)
}

/**
 * Connects a stream source to the main session.
 *
 * @param source Stream source to connect
 */
export function connectStreamSource(source: StreamSource): void {
  session.connectStreamSource(source)
}

/**
 * Disconnects a stream source from the main session.
 *
 * @param source Stream source to disconnect
 */
export function disconnectStreamSource(source: StreamSource): void {
  session.disconnectStreamSource(source)
}

/**
 * Renders a stream message to the main session by appending it to the
 * current document.
 *
 * @param message Message to render
 */
export function renderStreamMessage(message: StreamMessage | string): void {
  session.renderStreamMessage(message)
}

/**
 * Sets the delay after which the progress bar will appear during navigation.
 *
 * The progress bar appears after 500ms by default.
 *
 * Note that this method has no effect when used with the iOS or Android
 * adapters.
 *
 * @param delay Time to delay in milliseconds
 */
export function setProgressBarDelay(delay: number): void {
  console.warn(
    "Please replace `Turbo.setProgressBarDelay(delay)` with `Turbo.config.drive.progressBarDelay = delay`. The top-level function is deprecated and will be removed in a future version of Turbo.`"
  )
  config.drive.progressBarDelay = delay
}

export function setConfirmMethod(confirmMethod: ConfirmMethod): void {
  console.warn(
    "Please replace `Turbo.setConfirmMethod(confirmMethod)` with `Turbo.config.forms.confirm = confirmMethod`. The top-level function is deprecated and will be removed in a future version of Turbo.`"
  )
  config.forms.confirm = confirmMethod
}

export function setFormMode(mode: FormMode): void {
  console.warn(
    "Please replace `Turbo.setFormMode(mode)` with `Turbo.config.forms.mode = mode`. The top-level function is deprecated and will be removed in a future version of Turbo.`"
  )
  config.forms.mode = mode
}

/**
 * Morph the state of the currentBody based on the attributes and contents of
 * the newBody. Morphing body elements may dispatch turbo:morph,
 * turbo:before-morph-element, turbo:before-morph-attribute, and
 * turbo:morph-element events.
 *
 * @param currentBody HTMLBodyElement destination of morphing changes
 * @param newBody HTMLBodyElement source of morphing changes
 */
export function morphBodyElements(currentBody: HTMLBodyElement, newBody: HTMLBodyElement): void {
  MorphingPageRenderer.renderElement(currentBody, newBody)
}

/**
 * Morph the child elements of the currentFrame based on the child elements of
 * the newFrame. Morphing turbo-frame elements may dispatch turbo:before-frame-morph,
 * turbo:before-morph-element, turbo:before-morph-attribute, and
 * turbo:morph-element events.
 *
 * @param currentFrame FrameElement destination of morphing children changes
 * @param newFrame FrameElement source of morphing children changes
 */
export function morphTurboFrameElements(currentFrame: FrameElement, newFrame: FrameElement): void {
  MorphingFrameRenderer.renderElement(currentFrame, newFrame)
}
