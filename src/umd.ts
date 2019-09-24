import { start } from "./index"

import "./script_warning"

export * from "./index"

if (!isAMD() && !isCommonJS()) {
  start()
}

declare var define: (() => any) & { amd: any }

function isAMD() {
  return typeof define == "function" && define.amd
}

function isCommonJS() {
  return typeof exports == "object" && typeof module != "undefined"
}
