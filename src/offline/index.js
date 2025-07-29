import { ServiceWorker } from "./service_worker"
import { config } from "./config"

// Create a serviceWorker instance like how Turbo creates session, navigator, etc.
const serviceWorker = new ServiceWorker()

export { config, serviceWorker, ServiceWorker }
