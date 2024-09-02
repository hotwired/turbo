import { Session } from "./session"
import { PageRenderer } from "./drive/page_renderer"
import { PageSnapshot } from "./drive/page_snapshot"
import { FrameRenderer } from "./frames/frame_renderer"
import { fetch, recentRequests } from "../http/fetch"
import { config } from "./config"
import { unvisitableExtensions } from "./url"

const session = new Session(recentRequests)
const { cache, navigator } = session
export { navigator, session, cache, PageRenderer, PageSnapshot, FrameRenderer, fetch, config, unvisitableExtensions }

/**
 * Starts the main session.
 * This initialises any necessary observers such as those to monitor
 * link interactions.
 */
export function start() {
  session.start()
}

/**
 * Registers an adapter for the main session.
 *
 * @param adapter Adapter to register
 */
export function registerAdapter(adapter) {
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
 */
export function visit(location, options) {
  session.visit(location, options)
}

/**
 * Connects a stream source to the main session.
 *
 * @param source Stream source to connect
 */
export function connectStreamSource(source) {
  session.connectStreamSource(source)
}

/**
 * Disconnects a stream source from the main session.
 *
 * @param source Stream source to disconnect
 */
export function disconnectStreamSource(source) {
  session.disconnectStreamSource(source)
}

/**
 * Renders a stream message to the main session by appending it to the
 * current document.
 *
 * @param message Message to render
 */
export function renderStreamMessage(message) {
  session.renderStreamMessage(message)
}

/**
 * Removes all entries from the Turbo Drive page cache.
 * Call this when state has changed on the server that may affect cached pages.
 *
 * @deprecated since version 7.2.0 in favor of `Turbo.cache.clear()`
 */
export function clearCache() {
  console.warn(
    "Please replace `Turbo.clearCache()` with `Turbo.cache.clear()`. The top-level function is deprecated and will be removed in a future version of Turbo.`"
  )
  session.clearCache()
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
export function setProgressBarDelay(delay) {
  console.warn(
    "Please replace `Turbo.setProgressBarDelay(delay)` with `Turbo.config.drive.progressBarDelay = delay`. The top-level function is deprecated and will be removed in a future version of Turbo.`"
  )
  config.drive.progressBarDelay = delay
}

export function setConfirmMethod(confirmMethod) {
  console.warn(
    "Please replace `Turbo.setConfirmMethod(confirmMethod)` with `Turbo.config.forms.confirm = confirmMethod`. The top-level function is deprecated and will be removed in a future version of Turbo.`"
  )
  config.forms.confirm = confirmMethod
}

export function setFormMode(mode) {
  console.warn(
    "Please replace `Turbo.setFormMode(mode)` with `Turbo.config.forms.mode = mode`. The top-level function is deprecated and will be removed in a future version of Turbo.`"
  )
  config.forms.mode = mode
}
