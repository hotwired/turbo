// Type-only module: global declarations for consumers of Turbo's types.
import type * as Core from "./core"
import type { TurboStreamActions } from "./core/streams/stream_actions"
import type { TurboGlobalEventHandlersEventMap } from "./core/events"
import type { FrameElement } from "./elements/frame_element"
import type { StreamElement } from "./elements/stream_element"
import type { StreamSourceElement } from "./elements/stream_source_element"

/** The `Turbo` object installed on `window`. */
export type TurboGlobal = typeof Core & { StreamActions: TurboStreamActions }

export interface TurboElementTagNameMap {
  "turbo-frame": FrameElement
  "turbo-stream": StreamElement
  "turbo-stream-source": StreamSourceElement
}

declare global {
  // `var`, not `const`, so that globalThis.Turbo is typed as well.
  // eslint-disable-next-line no-var
  var Turbo: TurboGlobal

  interface Window {
    Turbo: TurboGlobal
  }

  /* eslint-disable @typescript-eslint/no-empty-object-type */
  interface HTMLElementTagNameMap extends TurboElementTagNameMap {}
  // Document-level events are dispatched on <html>, so element listeners can receive them too.
  interface ElementEventMap extends TurboGlobalEventHandlersEventMap {}
  interface GlobalEventHandlersEventMap extends TurboGlobalEventHandlersEventMap {}
  /* eslint-enable @typescript-eslint/no-empty-object-type */
}
