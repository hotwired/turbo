import "./polyfills"
import "./elements"
import "./script_warning"

export * from "./core"
import * as Turbo from "./core"
window.Turbo = Turbo
Turbo.start()
