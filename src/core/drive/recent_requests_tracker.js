import { LimitedSet, LimitedMap } from "../../util"

export class RecentRequestsTracker {
  constructor(limit = 20) {
    this.limit = limit
    this.refreshedUrls = new LimitedMap(limit)
  }

  addRequestId(requestId) {
    if (!this.refreshedUrls.has(requestId)) {
      this.refreshedUrls.set(requestId, new LimitedSet(this.limit))
    }
  }

  get requestIds() {
    return new Set(this.refreshedUrls.keys())
  }

  markUrlAsRefreshed(requestId, refreshUrl) {
    this.addRequestId(requestId)

    this.refreshedUrls.get(requestId).add(refreshUrl)
  }

  hasRefreshedUrl(requestId, refreshUrl) {
    const urls = this.refreshedUrls.get(requestId)
    return urls ? urls.has(refreshUrl) : false
  }
}
