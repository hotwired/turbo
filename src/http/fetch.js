import { uuid } from "../util"
import { LimitedSet } from "../core/drive/limited_set"

export const recentRequests = new LimitedSet(20)

const nativeFetch = window.fetch

function fetchWithTurboHeaders(resource, options = {}) {
  const headers = resource instanceof Request ?
    resource.headers :
    new Headers(options.headers || {})

  const requestUID = uuid()
  recentRequests.add(requestUID)
  headers.append("X-Turbo-Request-Id", requestUID)

  return nativeFetch(resource, {
    ...options,
    headers
  })
}

export { fetchWithTurboHeaders as fetch }
