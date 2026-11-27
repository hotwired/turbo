import { setMetaContent } from "../util"
import type { Session } from "./session"

export class Cache {
  declare readonly session: Session

  constructor(session: Session) {
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

  #setCacheControl(value: string) {
    setMetaContent("turbo-cache-control", value)
  }
}
