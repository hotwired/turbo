import { uuid } from "../util"

const nativeFetch = window.fetch

function fetchWithTurboHeaders(url, options = {}) {
  const modifiedHeaders = new Headers(options.headers || {})
  const requestUID = uuid()
  window.Turbo.session.recentRequests.add(requestUID)
  modifiedHeaders.append("X-Turbo-Request-Id", requestUID)

  return nativeFetch(url, {
    ...options,
    headers: modifiedHeaders
  })
}

export { fetchWithTurboHeaders as fetch }
