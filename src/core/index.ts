import { Adapter } from "./native/adapter"
import { Session } from "./session"
import { Locatable } from "./url"
import { StreamMessage } from "./streams/stream_message"
import { StreamSource } from "./types"
import { VisitOptions } from "./drive/visit"
import { RequestInterceptor } from "./request_interceptor"

const session = new Session
const { navigator } = session
export { navigator }

export function start() {
  session.start()
}

export function registerAdapter(adapter: Adapter) {
  session.registerAdapter(adapter)
}

export function visit(location: Locatable, options?: Partial<VisitOptions>) {
  session.visit(location, options)
}

export function connectStreamSource(source: StreamSource) {
  session.connectStreamSource(source)
}

export function disconnectStreamSource(source: StreamSource) {
  session.disconnectStreamSource(source)
}

export function renderStreamMessage(message: StreamMessage | string) {
  session.renderStreamMessage(message)
}

export function clearCache() {
  session.clearCache()
}

export function setProgressBarDelay(delay: number) {
  session.setProgressBarDelay(delay)
}

export function setRequestInterceptor(interceptor: (request: any) => void) {
  RequestInterceptor.register(interceptor)
}

export function clearRequestInterceptor() {
  RequestInterceptor.reset()
}
