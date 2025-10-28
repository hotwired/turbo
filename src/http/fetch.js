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

  tryMarkingAsRefreshed(requestUID, response, options)

  return response
}

function tryMarkingAsRefreshed(requestUID, response, options) {
  if (successfulNonTurboFrameRedirect(response, options)) {
    // Mark the redirected URL as refreshed for this request ID when it's not
    // a Turbo frame request (normal navigation or escaping one via
    // data-turbo-frame="_top"), since it's where the user will be sent to and
    // thus it's already fresh.
    //
    // If it's within a Turbo frame, we don't consider it refreshed because the
    // content outside the frame will be discarded.
    recentRequests.markUrlAsRefreshed(requestUID, response.url)
  } else if (unprocessableEntity(response)) {
    // Turbo will render 422 responses to allow handling form errors and they're
    // considered page refreshes. So for this request ID, the browser is already
    // displaying fresh content, and since the server couldn't process the
    // request, refreshing the page would just show the same content.
    recentRequests.markUrlAsRefreshed(requestUID, document.baseURI)
  }
}

function successfulNonTurboFrameRedirect(response, options) {
  return response.ok && response.redirected && !options?.headers?.["Turbo-Frame"]
}

function unprocessableEntity(response) {
  return response.status === 422
}

export { fetchWithTurboHeaders as fetch }
