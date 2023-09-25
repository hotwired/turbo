import { setMetaContent } from "../util"
import { SnapshotCache } from "./drive/snapshot_cache"

export class Cache {
  constructor(session) {
    this.session = session
  }

  clear() {
    this.store.clear()
  }

  resetCacheControl() {
    this.#setCacheControl("")
  }

  exemptPageFromCache() {
    this.#setCacheControl("no-cache")
  }

  exemptPageFromPreview() {
    this.#setCacheControl("no-preview")
  }

  set store(store) {
    if (typeof store === "string") {
      SnapshotCache.setStore(store)
    } else {
      SnapshotCache.currentStore = store
    }
  }

  get store() {
    return SnapshotCache.currentStore
  }

  #setCacheControl(value) {
    setMetaContent("turbo-cache-control", value)
  }
}
