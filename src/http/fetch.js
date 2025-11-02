import { uuid } from "../util"
import { LimitedSet } from "../core/drive/limited_set"

export const recentRequests = new LimitedSet(20)

function fetchWithTurboHeaders(resource, options = {}) {
  const modifiedHeaders = resource instanceof Request ?
    resource.headers :
    new Headers(options.headers || {})

  const requestUID = uuid()
  recentRequests.add(requestUID)
  modifiedHeaders.append("X-Turbo-Request-Id", requestUID)

  return window.fetch(resource, {
    ...options,
    headers: modifiedHeaders
  })
}

export { fetchWithTurboHeaders as fetch }
