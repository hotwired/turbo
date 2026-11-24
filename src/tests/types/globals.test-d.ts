// Type-level tests: compiled by `yarn test:types`, never run.
import type {} from "../../index"
import type { FrameElement } from "../../elements/frame_element"
import type {
  TurboBeforeMorphAttributeEvent,
  TurboBeforeMorphElementEvent,
  TurboBeforeFrameMorphEvent,
  TurboBeforePrefetchEvent,
  TurboBeforeStreamRenderEvent,
  TurboClickEvent,
  TurboFrameLoadEvent,
  TurboLoadEvent,
  TurboMorphElementEvent
} from "../../core/events"
import type { TurboGlobal } from "../../globals"

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
function assertType<T extends true>(): T | void {}

// Custom elements are known to querySelector.
const frame = document.querySelector("turbo-frame")
assertType<Equals<typeof frame, FrameElement | null>>()

// Turbo events are known to addEventListener.
document.addEventListener("turbo:load", (event) => {
  assertType<Equals<typeof event, TurboLoadEvent>>()
  const url: string = event.detail.url
  return url
})

// Turbo events dispatched on elements are known to Element#addEventListener.
declare const element: Element
element.addEventListener("turbo:frame-load", (event) => assertType<Equals<typeof event, TurboFrameLoadEvent>>())
element.addEventListener("turbo:click", (event) => assertType<Equals<typeof event, TurboClickEvent>>())
element.addEventListener("turbo:before-prefetch", (event) => assertType<Equals<typeof event, TurboBeforePrefetchEvent>>())
element.addEventListener("turbo:before-stream-render", (event) =>
  assertType<Equals<typeof event, TurboBeforeStreamRenderEvent>>()
)
element.addEventListener("turbo:before-morph-element", (event) =>
  assertType<Equals<typeof event, TurboBeforeMorphElementEvent>>()
)
element.addEventListener("turbo:morph-element", (event) => assertType<Equals<typeof event, TurboMorphElementEvent>>())
element.addEventListener("turbo:before-morph-attribute", (event) =>
  assertType<Equals<typeof event, TurboBeforeMorphAttributeEvent>>()
)
element.addEventListener("turbo:before-frame-morph", (event) =>
  assertType<Equals<typeof event, TurboBeforeFrameMorphEvent>>()
)
window.addEventListener("turbo:load", (event) => assertType<Equals<typeof event, TurboLoadEvent>>())

// The Turbo global and window.Turbo expose the public API.
Turbo.visit("/")
window.Turbo.StreamActions.custom = function () {
  this.targetElements.forEach((element) => element.remove())
}

assertType<Equals<typeof Turbo, TurboGlobal>>()
assertType<Equals<typeof window.Turbo, TurboGlobal>>()
// @ts-expect-error -- not part of the API
Turbo.notAnApiMethod()
