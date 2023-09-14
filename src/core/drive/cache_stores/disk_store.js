import { PageSnapshot } from "../page_snapshot"

export class DiskStore {
  _version = "v1"

  constructor() {
    if (typeof caches === "undefined") {
      throw new Error("windows.caches is undefined. CacheStore requires a secure context.")
    }

    this.storage = this.openStorage()
  }

  async has(location) {
    const storage = await this.openStorage()
    return (await storage.match(location)) !== undefined
  }

  async get(location) {
    const storage = await this.openStorage()
    const response = await storage.match(location)

    if (response && response.ok) {
      const html = await response.text()
      return PageSnapshot.fromHTMLString(html)
    }
  }

  async put(location, snapshot) {
    const storage = await this.openStorage()

    const response = new Response(snapshot.html, {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "text/html"
      }
    })
    await storage.put(location, response)
    return snapshot
  }

  async clear() {
    const storage = await this.openStorage()
    const keys = await storage.keys()
    await Promise.all(keys.map((key) => storage.delete(key)))
  }

  openStorage() {
    this.storage ||= caches.open(`turbo-${this.version}`)
    return this.storage
  }

  set version(value) {
    if (value !== this._version) {
      this._version = value
      this.storage ||= caches.open(`turbo-${this.version}`)
    }
  }

  get version() {
    return this._version
  }
}
