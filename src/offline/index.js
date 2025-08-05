import { ServiceWorker } from "./service_worker"
import { config } from "./config"

const serviceWorker = new ServiceWorker()

export { config, serviceWorker, ServiceWorker }
