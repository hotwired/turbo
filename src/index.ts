import "./polyfills/custom-elements-native-shim"

import { Controller } from "./controller"
import { Locatable } from "./location"
import { VisitOptions } from "./visit"

export * from "./adapter"
export * from "./controller"
export * from "./fetch_request"
export * from "./fetch_response"
export * from "./form_submission"
export * from "./location"
export * from "./visit"

export const controller = new Controller

export const supported = Controller.supported

export function visit(location: Locatable, options?: Partial<VisitOptions>) {
  controller.visit(location, options)
}

export function clearCache() {
  controller.clearCache()
}

export function setProgressBarDelay(delay: number) {
  controller.setProgressBarDelay(delay)
}

export function start() {
  controller.start()
}
