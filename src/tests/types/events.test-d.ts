// Type-level tests: compiled by `yarn test:types`, never run.
import { dispatch } from "../../util"
import type { StructuredReason } from "../../core/types"
import type {
  StreamRender,
  TurboBeforeCacheEvent,
  TurboReloadEvent,
  TurboBeforeFetchRequestEvent,
  TurboBeforePrefetchEvent,
  TurboFrameLoadEvent,
  TurboLoadEvent
} from "../../core/events"

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
function assertType<T extends true>(): T | void {}

// Known Turbo events return their specific event type.
const load = dispatch("turbo:load", { detail: { url: "/", timing: {} } })
assertType<Equals<typeof load, TurboLoadEvent>>()

const beforeFetch = dispatch("turbo:before-fetch-request", {
  cancelable: true,
  detail: { fetchOptions: { method: "GET", headers: {}, body: null }, url: new URL("http://example.com"), resume: () => {} }
})
assertType<Equals<typeof beforeFetch, TurboBeforeFetchRequestEvent>>()

// A wrong detail for a known Turbo event is rejected.
// @ts-expect-error -- detail does not match turbo:load
dispatch("turbo:load", { detail: { wrong: 1 } })

// A known Turbo event whose detail is not nullable requires one.
// @ts-expect-error -- turbo:load requires a detail
dispatch("turbo:load")
// @ts-expect-error -- turbo:visit requires a detail
dispatch("turbo:visit", { target: document })

// Events without a detail need no options, or only a target.
const beforeCache = dispatch("turbo:before-cache")
assertType<Equals<typeof beforeCache, TurboBeforeCacheEvent>>()
dispatch("turbo:frame-load", { target: document })
dispatch("turbo:reload")

// Other event names still work and return a CustomEvent with an unknown detail.
const custom = dispatch("x:custom", { detail: { anything: true } })
assertType<Equals<typeof custom, CustomEvent<unknown>>>()
dispatch("x:custom")

// Events dispatched without a detail carry `null` at runtime (CustomEvent's default).
assertType<Equals<TurboFrameLoadEvent["detail"], null>>()
assertType<Equals<TurboBeforeCacheEvent["detail"], null>>()
assertType<Equals<TurboBeforePrefetchEvent["detail"], null>>()

// turbo:reload without a reason carries null: CustomEvent turns an undefined detail into null.
assertType<Equals<TurboReloadEvent["detail"], StructuredReason | null>>()

// A custom stream renderer may be synchronous; Turbo awaits it either way.
const syncRender: StreamRender = (stream) => {
  stream.remove()
}
void syncRender
