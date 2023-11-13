import { setMetaContent } from "../util"

export class Cache {
  clear() {
    this.session.clearCache()
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

  #setCacheControl(value) {
    setMetaContent("turbo-cache-control", value)
  }
}
