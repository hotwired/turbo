import { ServiceWorker } from "./service_worker"
import * as handlers from "./handlers"

const serviceWorker = new ServiceWorker()

export { serviceWorker, ServiceWorker, handlers }

export function addRule(rule) {
  serviceWorker.addRule(rule)
}

export function start() {
  serviceWorker.start()
}
