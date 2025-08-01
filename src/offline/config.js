export const config = {
  enabled: false,
  serviceWorkerPath: "/service-worker.js",
  cacheName: "turbo-offline-cache-v1",
  offlinePagePath: "/offline",
  networkTimeoutMs: 3000,
  cacheRegistry: {
    databaseName: "turbo-offline-database",
    storeName: "turbo-offline-cache-metadata",
    databaseVersion: 1
  }
}
