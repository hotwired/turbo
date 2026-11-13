import { setMetaContent } from "../util"

export class Cache {
  constructor(session) {
    this.session = session
  }

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
