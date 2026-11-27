// Compiled by `yarn test:consumer` against the built declarations in dist/types,
// the way an application that installs @hotwired/turbo sees them. Never run.
import {
  config,
  type ConfirmMethod,
  type FetchRequest,
  type FormSubmissionOutcome,
  type StreamRefreshOptions,
  type TurboFetchOptions,
  type FormMode,
  type FormsConfig,
  morphElements,
  type Locatable,
  type ReloadReason,
  type RenderMethod,
  type StructuredReason,
  type Submitter,
  type TurboConfig,
  type ViewRenderOptions
} from "@hotwired/turbo"

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
function assertType<T extends true>(): T | void {}

// The exported config matches its exported types.
const forms: FormsConfig = config.forms
const turboConfig: TurboConfig = config
forms.mode = "optin"
forms.submitter = "aria-disabled"

// The Turbo global is also a property of globalThis.
globalThis.Turbo.visit("/")
window.Turbo.visit("/")

// Listeners may replace the request body with anything fetch accepts, and remove headers with delete.
document.addEventListener("turbo:before-fetch-request", (event) => {
  event.detail.fetchOptions.body = JSON.stringify({ id: 1 })
  event.detail.fetchOptions.headers["X-Present"] = "1"
  delete event.detail.fetchOptions.headers["X-Present"]
  // The fetch options can be passed on to fetch or Request as they are.
  void new Request(event.detail.url, event.detail.fetchOptions)
})

// morphElements accepts an HTML string and the Idiomorph options Turbo forwards.
morphElements(document.body, "<body></body>", {
  morphStyle: "innerHTML",
  ignoreActive: true,
  ignoreActiveValue: true,
  restoreFocus: true,
  head: { style: "merge", shouldPreserve: (element) => element.hasAttribute("data-keep") }
})

// Document-level events are dispatched on <html>, so element listeners see them typed.
declare const root: Element
root.addEventListener("turbo:load", (event) => event.detail.url)
root.addEventListener("turbo:reload", (event) => {
  assertType<Equals<typeof event.detail, StructuredReason | null>>()
})

// Types used in public signatures can be named from the package root.
const confirm: ConfirmMethod = async () => true
const mode: FormMode = "on"
const location: Locatable = "/"
const renderMethod: RenderMethod = "morph"
declare const submitter: Submitter
declare const reason: ReloadReason
declare const options: ViewRenderOptions
void [turboConfig, confirm, mode, location, renderMethod, submitter, reason, options]

// turbo:submit-end narrows to a response or an error.
document.addEventListener("turbo:submit-end", (event) => {
  const { detail } = event
  if (detail.success === false) {
    if (detail.error) detail.error.message.trim()
    else detail.fetchResponse.statusCode.toFixed()
  }
})

// A request's fetch options are the object listeners change.
declare const request: FetchRequest
const fetchOptions: TurboFetchOptions = request.fetchOptions
declare const outcome: FormSubmissionOutcome
declare const refreshOptions: StreamRefreshOptions
void [fetchOptions, outcome, refreshOptions]
