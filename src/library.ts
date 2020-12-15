import { Adapter } from "./adapter"
import { Controller } from "./controller"
import { Locatable } from "./location"
import { StreamMessage } from "./stream_message"
import { StreamSource } from "./types"
import { VisitOptions } from "./visit"

const controller = new Controller
const { navigator } = controller
export { navigator }

export function start() {
  controller.start()
}

export function registerAdapter(adapter: Adapter) {
  controller.registerAdapter(adapter)
}

export function visit(location: Locatable, options?: Partial<VisitOptions>) {
  controller.visit(location, options)
}

export function connectStreamSource(source: StreamSource) {
  controller.connectStreamSource(source)
}

export function disconnectStreamSource(source: StreamSource) {
  controller.disconnectStreamSource(source)
}

export function renderStreamMessage(message: StreamMessage | string) {
  controller.renderStreamMessage(message)
}

export function clearCache() {
  controller.clearCache()
}

export function setProgressBarDelay(delay: number) {
  controller.setProgressBarDelay(delay)
}
