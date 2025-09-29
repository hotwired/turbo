import { uuid } from "../util"
import { RecentRequestsTracker } from "../core/drive/recent_requests_tracker"

export const recentRequests = new RecentRequestsTracker(20)

async function fetchWithTurboHeaders(url, options = {}) {
  const modifiedHeaders = new Headers(options.headers || {})
  const requestUID = uuid()
  recentRequests.addRequestId(requestUID)
  modifiedHeaders.append("X-Turbo-Request-Id", requestUID)

  const response = await window.fetch(url, {
    ...options,
    headers: modifiedHeaders
  })

  if (shouldMarkUrlAsRefreshed(response, options)) {
    recentRequests.markUrlAsRefreshed(requestUID, response.url)
  }

  return response
}

function shouldMarkUrlAsRefreshed(response, options) {
  // Mark the redirected URL as refreshed for this request ID when it's not
  // a Turbo frame request (normal navigation or escaping one via
  // data-turbo-frame="_top"), since it's where the user will be sent to and
  // thus it's already fresh.
  //
  // If it's within a Turbo frame, we don't consider it refreshed because the
  // content outside the frame will be discarded.
  return response.ok && response.redirected && !options?.headers?.["Turbo-Frame"]
}

export { fetchWithTurboHeaders as fetch }
