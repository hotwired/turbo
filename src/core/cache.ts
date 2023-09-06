import { Session } from "./session"
import { setMetaContent } from "../util"

export class Cache {
  readonly session: Session

  constructor(session: Session) {
    this.session = session
  }

  clear() {
    this.session.clearCache()
  }

  resetCacheControl() {
    this.setCacheControl("")
  }

  exemptPageFromCache() {
    this.setCacheControl("no-cache")
  }

  exemptPageFromPreview() {
    this.setCacheControl("no-preview")
  }

  private setCacheControl(value: string) {
    setMetaContent("turbo-cache-control", value)
  }
}
