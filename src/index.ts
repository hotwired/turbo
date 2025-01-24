import "./polyfills"
import "./elements"
import "./script_warning"

import * as Turbo from "./core"

window.Turbo = Turbo
Turbo.start()

console.info("neosyne/turbo:7.3.0#fix/form-turbo-frame")

export * from "./core"
export * from "./elements"
export * from "./http"
