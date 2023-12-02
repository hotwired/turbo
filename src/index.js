import "./polyfills"
import "./elements"
import "./script_warning"
import { StreamActions } from "./core/streams/stream_actions"

import * as Turbo from "./core"

window.Turbo = { ...Turbo, StreamActions }
Turbo.start()

export { StreamActions }
export * from "./core"
export * from "./elements"
export * from "./http"
